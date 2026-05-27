import json
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

_connections: Dict[str, Set[WebSocket]] = {}


@router.websocket("/ws/{tenant_id}")
async def billing_ws(websocket: WebSocket, tenant_id: str):
    await websocket.accept()
    _connections.setdefault(tenant_id, set()).add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        _connections.get(tenant_id, set()).discard(websocket)


async def broadcast_billing_update(tenant_id: str, payload: dict) -> None:
    for ws in list(_connections.get(tenant_id, set())):
        try:
            await ws.send_json({"type": "billing_update", "data": payload})
        except Exception:
            _connections.get(tenant_id, set()).discard(ws)
