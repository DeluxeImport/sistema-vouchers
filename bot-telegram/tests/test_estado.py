import time

from bot import estado


def test_crear_y_obtener_pendiente():
    sid = estado.crear("111", "-100", "file123", 1, ["SFIJOS_FLETE"])
    p = estado.obtener(sid)
    assert p is not None
    assert p.telegram_user_id == "111"
    assert p.chat_id == "-100"
    assert p.file_id == "file123"
    assert p.categorias_permitidas == ["SFIJOS_FLETE"]


def test_eliminar_pendiente():
    sid = estado.crear("111", "-100", "file123", 1, ["SFIJOS_FLETE"])
    estado.eliminar(sid)
    assert estado.obtener(sid) is None


def test_pendiente_inexistente_devuelve_none():
    assert estado.obtener("no-existe") is None


def test_pendientes_vencidos_se_limpian(monkeypatch):
    sid = estado.crear("111", "-100", "file123", 1, ["SFIJOS_FLETE"])
    futuro = time.time() + (estado.MINUTOS_EXPIRACION + 1) * 60
    monkeypatch.setattr(estado, "time", lambda: futuro)
    assert estado.obtener(sid) is None


def test_pendiente_vigente_no_se_limpia(monkeypatch):
    sid = estado.crear("111", "-100", "file123", 1, ["SFIJOS_FLETE"])
    poco_despues = time.time() + 1
    monkeypatch.setattr(estado, "time", lambda: poco_despues)
    assert estado.obtener(sid) is not None
