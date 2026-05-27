from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(ObjectId())


def serialize_doc(doc: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for key, val in list(doc.items()):
        if isinstance(val, ObjectId):
            doc[key] = str(val)
        elif isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc
