import re

with open("src/pages/driver/dashboard.jsx", "r") as f:
    content = f.read()

# Fix fonts: add font-sans to all h1, h2, h3
content = re.sub(r'<h1 className="([^"]*)"', r'<h1 className="\1 font-sans"', content)
content = re.sub(r'<h2 className="([^"]*)"', r'<h2 className="\1 font-sans"', content)
content = re.sub(r'<h3 className="([^"]*)"', r'<h3 className="\1 font-sans"', content)
content = re.sub(r'<h4 className="([^"]*)"', r'<h4 className="\1 font-sans"', content)

# Fix body background on mount
body_effect = """
  useEffect(() => {
    document.body.style.backgroundColor = '#09090b';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);
"""

content = content.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n" + body_effect)

with open("src/pages/driver/dashboard.jsx", "w") as f:
    f.write(content)
