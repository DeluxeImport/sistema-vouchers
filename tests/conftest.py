import pytest

from bot import extraccion


@pytest.fixture(autouse=True)
def _anio_fijo(monkeypatch):
    # Los casos de prueba son comprobantes reales de 2026; fijamos el "año
    # actual" para que el filtro de antiguedad no los descarte con el tiempo.
    monkeypatch.setattr(extraccion, "_anio_actual", lambda: 2026)
