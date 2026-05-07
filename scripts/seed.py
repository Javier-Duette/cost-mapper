import os
import sys

# Agregamos la ruta actual al path para poder importar modulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, SQLModel
from decimal import Decimal

from db.session import engine, create_db_and_tables
from catalog.models import CatalogItem, APUComponent, _uuid, _now

# Primero nos aseguramos de que las tablas existan
create_db_and_tables()

# Datos extraidos de la imagen TCPO (Canteiro de obras)
# Formato: (nbr_code, facet, unit, description, [ (comp_nbr, comp_facet, comp_desc, comp_unit, quantity), ... ])

insumos = {
    # Mano de obra (2N)
    "2N 36 16 25 12 15": ("2N", "h", "Carpinteiro"),
    "2N 36 16 25 12 34": ("2N", "h", "Servente"),
    
    # Materiales (2C)
    "2C 03 06 02 11 10": ("2C", "m²", "Chapa de madeira compensada resinada 1,10 x 2,20 m # 6 mm"),
    "2C 03 06 02 11 11": ("2C", "m²", "Chapa de madeira compensada resinada 1,10 x 2,20 m # 10 mm"),
    "2C 03 12 05 00 18": ("2C", "m", "Pontalete de cedro 3a 7,5 x 7,5 cm"),
    "2C 03 12 05 00 19": ("2C", "m", "Pontalete de cedrinho 6,5 x 6,5 cm"),
    "2C 03 05 05 13 05": ("2C", "m", "Sarrafo 1\" x 4\""),
    "2C 03 12 05 00 21": ("2C", "m²", "Tábua de 3a 1\" x 12\""),
    "2C 03 12 05 00 22": ("2C", "m", "Tábua de cedrinho 2,3 x 30 cm"),
    "2C 03 08 02 13 59": ("2C", "kg", "Prego com cabeça 18 x 27, 62,1 mm x Ø 3,4 mm"),
    "2C 03 08 02 13 61": ("2C", "kg", "Prego com cabeça 18 x 30, 69 mm x Ø 3,4 mm"),
    "2C 11 05 03 00 77": ("2C", "un", "Cadeado em latão 40 mm"),
    "2C 05 06 02 21 20": ("2C", "un", "Ferrolho para portão com porta cadeado, 40 cm"),
    "2C 05 03 02 00 30": ("2C", "un", "Dobradiça leme zincada 6\""),
    "2C 03 16 04 20 01": ("2C", "m²", "Telha trapezoidal 43 mm em aço galvanizado"),
}

apus = [
    {
        "nbr_code": "3R 02 57 27 00 00 00 00 02",
        "facet": "3R",
        "unit": "m²",
        "description": "Tapume de proteção em chapa de madeira compensada resinada # 6 mm",
        "components": [
            ("2N 36 16 25 12 15", "0.4000"),
            ("2N 36 16 25 12 34", "0.4000"),
            ("2C 03 06 02 11 10", "1.1000"),
            ("2C 03 12 05 00 19", "1.6000"),
            ("2C 03 05 05 13 05", "1.6500"),
            ("2C 03 12 05 00 22", "0.5000"),
            ("2C 03 08 02 13 61", "0.1000"),
        ]
    },
    {
        "nbr_code": "3R 02 57 27 00 00 00 00 03",
        "facet": "3R",
        "unit": "un",
        "description": "Portão para tapume em chapa de madeira compensada resinada # 10 mm, 2 folhas, largura 3 m e altura 2 m",
        "components": [
            ("2N 36 16 25 12 15", "6.0000"),
            ("2N 36 16 25 12 34", "6.0000"),
            ("2C 03 06 02 11 11", "6.6000"),
            ("2C 03 12 05 00 19", "8.8000"),
            ("2C 03 05 05 13 05", "18.7000"),
            ("2C 03 12 05 00 22", "3.0000"),
            ("2C 11 05 03 00 77", "2.0000"),
            ("2C 05 06 02 21 20", "2.0000"),
            ("2C 05 03 02 00 30", "6.0000"),
            ("2C 03 08 02 13 61", "0.6000"),
        ]
    },
    {
        "nbr_code": "3R 02 57 27 00 00 00 00 04",
        "facet": "3R",
        "unit": "m²",
        "description": "Tapume de tábuas (sobrepostas)",
        "components": [
            ("2N 36 16 25 12 15", "1.0000"),
            ("2N 36 16 25 12 34", "0.6000"),
            ("2C 03 12 05 00 18", "3.1000"),
            ("2C 03 12 05 00 21", "1.2000"),
            ("2C 03 08 02 13 59", "0.2000"),
        ]
    },
    {
        "nbr_code": "3R 02 57 27 00 00 00 00 06",
        "facet": "3R",
        "unit": "m²",
        "description": "Tapume de proteção com telha trapezoidal em aço galvanizado # 0,43 mm em estrutura de madeira (1 aproveitamento)",
        "components": [
            ("2N 36 16 25 12 15", "0.4000"),
            ("2N 36 16 25 12 34", "0.4000"),
            ("2C 03 12 05 00 19", "1.6000"),
            ("2C 03 05 05 13 05", "1.6500"),
            ("2C 03 16 04 20 01", "1.0500"),
            ("2C 03 08 02 13 61", "0.0500"),
        ]
    }
]

def seed_db():
    print("Limpiando DB actual...")
    # Usar drop_all en lugar de borrar el archivo para evitar error de lock en Windows
    SQLModel.metadata.drop_all(engine)
    create_db_and_tables()

    with Session(engine) as session:
        # 1. Crear insumos
        print("Creando insumos...")
        insumos_db = {}
        for code, data in insumos.items():
            facet, unit, desc = data
            item = CatalogItem(
                id=_uuid(),
                nbr_code=code,
                facet=facet,
                unit=unit,
                description_es=desc,  # Guardamos portugues en es temporalmente
                description_pt=desc,
                classification_source="v15_official",
                creado_por="catalog_tcpo",
                oficial=True,
                bim_taggable=False,
                uuid_status="official"
            )
            session.add(item)
            insumos_db[code] = item
        
        session.commit()

        # 2. Crear APUs padre
        print("Creando servicios (APUs)...")
        for apu_data in apus:
            padre = CatalogItem(
                id=_uuid(),
                nbr_code=apu_data["nbr_code"],
                facet=apu_data["facet"],
                unit=apu_data["unit"],
                description_es=apu_data["description"],
                description_pt=apu_data["description"],
                classification_source="v15_official",
                creado_por="catalog_tcpo",
                oficial=True,
                bim_taggable=True, # 3R puede ser modelado
                uuid_status="official"
            )
            session.add(padre)
            session.commit()
            session.refresh(padre)

            # 3. Vincular componentes
            for comp_code, qty in apu_data["components"]:
                comp = insumos_db[comp_code]
                link = APUComponent(
                    id=_uuid(),
                    item_id=padre.id,
                    component_id=comp.id,
                    quantity=Decimal(qty),
                    unit=comp.unit,
                    source="tcpo"
                )
                session.add(link)
            
            session.commit()
            print(f"Creado APU: {padre.description_es}")

if __name__ == "__main__":
    seed_db()
    print("Seed exitoso!")
