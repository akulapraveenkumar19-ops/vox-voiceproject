import os
import json
import asyncio
import uuid
import copy
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "voxweb")

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(STORAGE_DIR, exist_ok=True)


# In-memory async fallback collection mimicking Motor collection API with disk persistence
class AsyncMemoryCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs
        self._sort_key = None
        self._sort_dir = 1
        self._limit_val = None
        self._skip_val = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list) and len(key_or_list) > 0:
            self._sort_key, self._sort_dir = key_or_list[0]
        else:
            self._sort_key = key_or_list
            self._sort_dir = direction
        return self

    def limit(self, limit: int):
        self._limit_val = limit
        return self

    def skip(self, skip: int):
        self._skip_val = skip
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        results = list(self._docs)
        if self._sort_key:
            results.sort(
                key=lambda d: d.get(self._sort_key, ""),
                reverse=(self._sort_dir == -1)
            )
        if self._skip_val:
            results = results[self._skip_val:]
        max_len = self._limit_val if self._limit_val is not None else length
        if max_len is not None:
            results = results[:max_len]
        return [copy.deepcopy(d) for d in results]

    def __aiter__(self):
        self._iter_docs = None
        return self

    async def __anext__(self):
        if self._iter_docs is None:
            self._iter_docs = await self.to_list()
            self._idx = 0
        if self._idx < len(self._iter_docs):
            item = self._iter_docs[self._idx]
            self._idx += 1
            return item
        raise StopAsyncIteration


class ResilientMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self.file_path = os.path.join(STORAGE_DIR, f"{name}.json")
        self._lock = asyncio.Lock()
        self._data: List[Dict[str, Any]] = self._load_from_disk()

    def _load_from_disk(self) -> List[Dict[str, Any]]:
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        return json.loads(content)
        except Exception as e:
            print(f"[DB] Notice: Could not load {self.name}.json ({e})")
        return []

    def _save_to_disk(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, default=str)
        except Exception as e:
            print(f"[DB] Error writing to {self.name}.json: {e}")

    def _matches(self, doc: Dict[str, Any], filter_doc: Dict[str, Any]) -> bool:
        if not filter_doc:
            return True
        for k, v in filter_doc.items():
            if k == "$or" and isinstance(v, list):
                if not any(self._matches(doc, cond) for cond in v):
                    return False
                continue
            doc_val = doc.get(k)
            if k == "_id" and doc_val is not None and not isinstance(v, dict):
                if str(doc_val) != str(v):
                    return False
                continue
            if isinstance(v, dict):
                # handle basic operators
                if "$gt" in v and not (doc_val is not None and doc_val > v["$gt"]):
                    return False
                if "$gte" in v and not (doc_val is not None and doc_val >= v["$gte"]):
                    return False
                if "$lt" in v and not (doc_val is not None and doc_val < v["$lt"]):
                    return False
                if "$lte" in v and not (doc_val is not None and doc_val <= v["$lte"]):
                    return False
                if "$ne" in v and doc_val == v["$ne"]:
                    return False
                if "$in" in v and doc_val not in v["$in"]:
                    return False
            elif doc_val != v:
                return False
        return True

    async def insert_one(self, document: Dict[str, Any]):
        async with self._lock:
            doc = copy.deepcopy(document)
            if "_id" not in doc:
                doc["_id"] = str(uuid.uuid4())
            self._data.append(doc)
            self._save_to_disk()
            class InsertResult:
                def __init__(self, inserted_id):
                    self.inserted_id = inserted_id
            return InsertResult(doc["_id"])

    async def find_one(self, filter_doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            for doc in self._data:
                if self._matches(doc, filter_doc):
                    return copy.deepcopy(doc)
            return None

    def find(self, filter_doc: Optional[Dict[str, Any]] = None) -> AsyncMemoryCursor:
        filter_doc = filter_doc or {}
        matches = [copy.deepcopy(d) for d in self._data if self._matches(d, filter_doc)]
        return AsyncMemoryCursor(matches)

    async def update_one(self, filter_doc: Dict[str, Any], update_doc: Dict[str, Any], upsert: bool = False):
        async with self._lock:
            matched_idx = -1
            for i, doc in enumerate(self._data):
                if self._matches(doc, filter_doc):
                    matched_idx = i
                    break

            class UpdateResult:
                def __init__(self, matched_count, modified_count, upserted_id=None):
                    self.matched_count = matched_count
                    self.modified_count = modified_count
                    self.upserted_id = upserted_id

            if matched_idx != -1:
                target = self._data[matched_idx]
                if "$set" in update_doc:
                    target.update(copy.deepcopy(update_doc["$set"]))
                if "$unset" in update_doc:
                    for field in update_doc["$unset"]:
                        target.pop(field, None)
                self._save_to_disk()
                return UpdateResult(1, 1)

            if upsert:
                new_doc = copy.deepcopy(filter_doc)
                if "$set" in update_doc:
                    new_doc.update(copy.deepcopy(update_doc["$set"]))
                if "_id" not in new_doc:
                    new_doc["_id"] = str(uuid.uuid4())
                self._data.append(new_doc)
                self._save_to_disk()
                return UpdateResult(0, 1, new_doc["_id"])

            return UpdateResult(0, 0)

    async def delete_many(self, filter_doc: Dict[str, Any]):
        async with self._lock:
            before = len(self._data)
            self._data = [d for d in self._data if not self._matches(d, filter_doc)]
            deleted = before - len(self._data)
            self._save_to_disk()
            class DeleteResult:
                def __init__(self, deleted_count):
                    self.deleted_count = deleted_count
            return DeleteResult(deleted)

    async def delete_one(self, filter_doc: Dict[str, Any]):
        async with self._lock:
            for i, doc in enumerate(self._data):
                if self._matches(doc, filter_doc):
                    del self._data[i]
                    self._save_to_disk()
                    class DeleteResult:
                        deleted_count = 1
                    return DeleteResult()
            class DeleteResultZero:
                deleted_count = 0
            return DeleteResultZero()

    async def count_documents(self, filter_doc: Optional[Dict[str, Any]] = None) -> int:
        filter_doc = filter_doc or {}
        async with self._lock:
            return sum(1 for d in self._data if self._matches(d, filter_doc))


class DatabaseManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_real_mongo = False
        self._memory_collections: Dict[str, ResilientMemoryCollection] = {
            "users": ResilientMemoryCollection("users"),
            "conversations": ResilientMemoryCollection("conversations"),
            "otps": ResilientMemoryCollection("otps"),
            "notes": ResilientMemoryCollection("notes"),
            "whatsapp_accounts": ResilientMemoryCollection("whatsapp_accounts"),
            "contacts": ResilientMemoryCollection("contacts"),
            "shortcuts": ResilientMemoryCollection("shortcuts"),
        }

    async def connect(self):
        try:
            import motor.motor_asyncio
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=1500
            )
            # Test ping
            await self.client.admin.command('ping')
            self.db = self.client[DATABASE_NAME]
            self.is_real_mongo = True
            print(f"[DB] Successfully connected to live MongoDB: {DATABASE_NAME}")
        except Exception as e:
            self.is_real_mongo = False
            self.client = None
            self.db = None
            print(f"[DB] Notice: MongoDB server not reachable at {MONGODB_URI} ({e}).")
            print("[DB] Falling back to resilient disk-persisted storage engine. All data will persist safely.")

    def get_collection(self, name: str):
        if self.is_real_mongo and self.db is not None:
            return self.db[name]
        if name not in self._memory_collections:
            self._memory_collections[name] = ResilientMemoryCollection(name)
        return self._memory_collections[name]

    @property
    def users(self):
        return self.get_collection("users")

    @property
    def conversations(self):
        return self.get_collection("conversations")

    @property
    def otps(self):
        return self.get_collection("otps")

    @property
    def notes(self):
        return self.get_collection("notes")

    @property
    def whatsapp_accounts(self):
        return self.get_collection("whatsapp_accounts")

    @property
    def contacts(self):
        return self.get_collection("contacts")

    @property
    def shortcuts(self):
        return self.get_collection("shortcuts")


db_manager = DatabaseManager()
