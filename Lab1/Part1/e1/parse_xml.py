import xml.etree.ElementTree as ET
import pandas as pd

tree = ET.parse("data/sample.xml")
root = tree.getroot()

data = []

for person in root.findall("person"):
    name = person.find("name").text
    age = person.find("age").text
    city = person.find("city").text

    data.append({
        "Name": name,
        "Age": age,
        "City": city
    })

df = pd.DataFrame(data)

print("XML DATA:")
print(df)

print("\nMissing Values:")
print(df.isnull().sum())
