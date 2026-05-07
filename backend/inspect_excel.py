import pandas as pd

file_path = "../scripts/data/ABNT-NBR-15965-5_2022_Resultados-da-construcao.xlsx"
df = pd.read_excel(file_path, sheet_name=0, nrows=5)
print("Columns:", df.columns.tolist())
