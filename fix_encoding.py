import re

with open('frontend/src/components/shared/DetailPanel.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'<th[^>]*>C.*DIGO</th>', '<th style={{ width: 120 }}>CÓDIGO</th>', text)
text = re.sub(r'<th[^>]*>P\. UNIT.*</th>', '<th className="num" style={{ width: 110 }}>P. UNIT (₲)</th>', text)
text = re.sub(r'â€”', '—', text)
text = re.sub(r'Ã¢â‚¬â€œ', '—', text)
text = re.sub(r'â€"', '—', text)
text = re.sub(r'â€“', '—', text)

with open('frontend/src/components/shared/DetailPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
