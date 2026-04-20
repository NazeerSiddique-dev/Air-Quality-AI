from bs4 import BeautifulSoup
import pandas as pd

with open("data/sample.html") as f:
    soup = BeautifulSoup(f, "html.parser")

table = soup.find("table")
rows = table.find_all("tr")

data = []

for row in rows[1:]:
    cols = row.find_all("td")
    name = cols[0].text
    age = cols[1].text
    city = cols[2].text

    data.append({
        "Name": name,
        "Age": age,
        "City": city
    })

df = pd.DataFrame(data)

print("HTML DATA:")
print(df)

print("\nMissing Values:")
print(df.isnull().sum())
