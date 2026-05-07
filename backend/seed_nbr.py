import os
import sys
import glob
import uuid
import pandas as pd
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.session import engine, create_db_and_tables
from catalog.models import CatalogItem

def get_consistent_uuid(nbr_code: str) -> str:
    """Genera un UUID consistente basado en el código NBR."""
    NAMESPACE_NBR = uuid.uuid5(uuid.NAMESPACE_DNS, "nbr15965.costmapper.org")
    return str(uuid.uuid5(NAMESPACE_NBR, nbr_code))

def seed_nbr():
    create_db_and_tables()
    
    excel_files = glob.glob("../scripts/data/*.xlsx")
    
    with Session(engine) as session:
        for file in excel_files:
            print(f"Procesando {os.path.basename(file)}...")
            
            try:
                # Leer la primera hoja
                df = pd.read_excel(file, sheet_name=0)
            except Exception as e:
                print(f"Error leyendo {file}: {e}")
                continue
                
            cols = df.columns.tolist()
            # Encontrar columnas (ignorar problemas de codificación)
            code_col = [c for c in cols if 'd' in c.lower() and 'g' in c.lower() and 'c' in c.lower()][0] # Cdigo
            term_col = [c for c in cols if 'term' in c.lower()][0] # Termo
            uuid_col = [c for c in cols if 'uuid' in str(c).lower()]
            
            count_added = 0
            for index, row in df.iterrows():
                nbr_code = str(row[code_col]).strip()
                if pd.isna(nbr_code) or not nbr_code or nbr_code.lower() == 'nan':
                    continue
                    
                termo = str(row[term_col]).strip()
                
                item_id = get_consistent_uuid(nbr_code)
                if uuid_col:
                    val = str(row[uuid_col[0]]).strip()
                    if val and val.lower() != 'nan':
                        item_id = val
                        
                facet = nbr_code.split(" ")[0] if " " in nbr_code else nbr_code[:2]
                
                # Validar si ya existe
                stmt = select(CatalogItem).where(CatalogItem.nbr_code == nbr_code)
                existing = session.exec(stmt).first()
                
                if not existing:
                    # Derivar parent
                    parts = nbr_code.split(" ")
                    # Simplificado: si termina en 00, el padre es el nivel anterior que no sea 00.
                    # Para MVP, dejamos parent_nbr_code=None y procesamos jerarquía más adelante si es necesario.
                    parent_code = None 
                    
                    bim_taggable = facet in ['3E', '4U', '2C', '3R']
                        
                    item = CatalogItem(
                        id=item_id,
                        nbr_code=nbr_code,
                        facet=facet,
                        unit="un", # Unidade padrão temporal
                        description_es=termo, # Temporariamente guardando en español
                        description_pt=termo,
                        classification_source="v15_official",
                        creado_por="system_seed",
                        oficial=True,
                        bim_taggable=bim_taggable,
                        uuid_status="official"
                    )
                    session.add(item)
                    count_added += 1
            
            try:
                session.commit()
                print(f"-> Cargados {count_added} ítems nuevos de {os.path.basename(file)}")
            except Exception as e:
                print(f"Error guardando {file}: {e}")
                session.rollback()

if __name__ == "__main__":
    seed_nbr()
