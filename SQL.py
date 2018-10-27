import MySQLdb
import xlrd

db = MySQLdb.connect(
	host = "localhost", 
	user = "root", 
	passwd = "root", 
	db = "ListenOnline",
	# db = "ListenOnline"
)
cursor = db.cursor()

cursor.execute("CREATE TEMPORARY TABLE IF NOT EXISTS test1(test1_ID TEXT, age TEXT, test1_name TEXT);")

book = xlrd.open_workbook("Workbook.xlsx")
sheet = book.sheet_by_name("test1")
query = """
	INSERT INTO 
		test1 (test1_ID, age, test1_name) 
	VALUES (%s, %s, %s)
"""

for r in range(1, sheet.nrows):
	test1_ID		= sheet.cell(r,0).value
	age				= sheet.cell(r,1).value
	test1_name		= sheet.cell(r,2).value

	print (type(test1_ID))

	values = (test1_ID, age, test1_name)
	cursor.execute(query, values)

cursor.execute("SELECT * FROM test1 WHERE test1_ID = '12';")
result = cursor.fetchall()
print (result)

db.close()