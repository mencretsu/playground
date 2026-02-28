import uiautomator2 as u2
import json

# connect ke device (otomatis ambil dari adb device pertama)
d = u2.connect()

# dump hierarki UI
xml = d.dump_hierarchy(compressed=True)

# simpan XML ke file
with open("result.xml", "w", encoding="utf-8") as f:
    f.write(xml)

# ---- parse XML ke JSON ----
import xml.etree.ElementTree as ET

def parse_node(node):
    obj = {
        "class": node.attrib.get("class"),
        "resource_id": node.attrib.get("resource-id"),
        "text": node.attrib.get("text"),
        "content_desc": node.attrib.get("content-desc"),
        "bounds": node.attrib.get("bounds"),
    }
    children = [parse_node(child) for child in node.findall("node")]
    if children:
        obj["children"] = children
    return obj

root = ET.fromstring(xml)
ui_dict = parse_node(root.find("node"))
result = {"hierarchy": ui_dict}

with open("ui.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("[*] UI dumped to ui.json")
#  lanjutkan menghasilkan uang
