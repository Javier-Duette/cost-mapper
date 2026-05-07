import re

with open('frontend/src/components/shared/DetailPanel.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix common garbled strings
text = text.replace('Seleccionǟ un ǟtem para ver su Anǟlisis', 'Seleccioná un ítem para ver su Análisis')
text = text.replace('Anǟlisis de Precio Unitario (APU)', 'Análisis de Precio Unitario (APU)')
text = text.replace('insumos \' ', 'insumos • ')
text = text.replace('\'', '•')
text = text.replace('ǽ?s', '₲')
text = text.replace('Cargando APUǽ\'', 'Cargando APU...')
text = text.replace('este ǟtem', 'este ítem')
text = text.replace('o" Verificado', '✓ Verificado')
text = text.replace('s? Verificar', '⚠️ Verificar')

with open('frontend/src/components/shared/DetailPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
