from bot.categorias import (
    GRUPOS,
    LABELS,
    etiqueta,
    grupo_de,
    grupos_permitidos,
    subcategorias_permitidas,
    tipos_permitidos,
)


def test_etiqueta_categoria_conocida():
    assert etiqueta("GA_OFICINA_LUZ") == "Oficina - Luz"


def test_etiqueta_categoria_desconocida_devuelve_el_codigo():
    assert etiqueta("NO_EXISTE") == "NO_EXISTE"


def test_grupo_de_encuentra_el_grupo_correcto():
    grupo = grupo_de("CV_FLETES")
    assert grupo is not None
    assert grupo.id == "COSTO_VENTAS"


def test_grupo_de_categoria_inexistente_o_anterior_no_tiene_grupo():
    assert grupo_de("NO_EXISTE") is None
    assert grupo_de("SFIJOS_FLETE") is None


def test_todos_los_grupos_tienen_al_menos_una_subcategoria():
    for g in GRUPOS:
        assert len(g.subcategorias) > 0


def test_todas_las_subcategorias_tienen_etiqueta_y_codigo_unico():
    todas = [c for g in GRUPOS for c in g.subcategorias]
    assert len(todas) == len(set(todas))
    for c in todas:
        assert c in LABELS


def test_callback_data_cabe_en_el_limite_de_telegram():
    # callback_data admite 64 bytes: "cat:<8 hex>:<codigo>" es el mas largo.
    for g in GRUPOS:
        assert len(f"grp:abcdef12:{g.id}".encode()) <= 64
        for c in g.subcategorias:
            assert len(f"cat:abcdef12:{c}".encode()) <= 64


def test_documentos_no_ofrecen_categorias_solo_de_voucher():
    otros = next(g for g in GRUPOS if g.id == "OTROS")
    permitidas = list(otros.subcategorias)
    assert "OTR_TRANSFERENCIAS" in subcategorias_permitidas(otros, permitidas)
    assert "OTR_TRANSFERENCIAS" not in subcategorias_permitidas(otros, permitidas, solo_documento=True)


def test_grupos_permitidos_solo_incluye_grupos_con_alguna_subcategoria_permitida():
    ids = [g.id for g in grupos_permitidos(["IMP_IGV", "RECOMPRAS"])]
    assert ids == ["RECOMPRAS", "IMPUESTOS"]


def test_tipos_permitidos_requiere_tipo_y_alguna_categoria_para_documentos():
    assert tipos_permitidos(["FACTURA", "IMP_IGV"]) == ["FACTURA"]
    # Sin categorias utiles para documentos no puede subir ninguno.
    assert tipos_permitidos(["FACTURA", "OTR_TRANSFERENCIAS"]) == []
    assert tipos_permitidos(["IMP_IGV"]) == []
