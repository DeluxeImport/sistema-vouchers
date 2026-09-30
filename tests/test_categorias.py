from bot.categorias import GRUPOS, etiqueta, grupo_de


def test_etiqueta_categoria_conocida():
    assert etiqueta("SFIJOS_FLETE") == "Flete"


def test_etiqueta_categoria_desconocida_devuelve_el_codigo():
    assert etiqueta("NO_EXISTE") == "NO_EXISTE"


def test_grupo_de_encuentra_el_grupo_correcto():
    grupo = grupo_de("COMPRAS_OFICINA")
    assert grupo is not None
    assert grupo.id == "compras"


def test_grupo_de_categoria_suelta_no_tiene_grupo():
    assert grupo_de("ALQUILER") is None


def test_grupo_de_categoria_inexistente_no_tiene_grupo():
    assert grupo_de("NO_EXISTE") is None


def test_todos_los_grupos_tienen_al_menos_una_subcategoria():
    for g in GRUPOS:
        assert len(g.subcategorias) > 0
