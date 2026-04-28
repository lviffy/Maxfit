# Learn DBMS, SQL, and MySQL Workbench Diagrams (Detailed Guide)

This file is a complete beginner-to-intermediate guide to help you truly understand databases for classes, labs, interviews, and viva.

## How to Use This File
- Read sections in order at least once.
- After each concept, run the SQL examples yourself.
- For viva prep, revise the short Q&A section daily.
- Keep one notebook page only for: PK, FK, joins, normalization, ACID.

---

## 1) DBMS Fundamentals

### 1.1 What is Data?
Data is raw facts (name, marks, age, phone, etc.).
When data is organized and meaningful, it becomes information.

### 1.2 What is a Database?
A database is an organized collection of related data stored in a structured way.
Example: College database storing students, faculty, courses, attendance.

### 1.3 What is DBMS?
DBMS (Database Management System) is software that lets users/applications:
- define data structure
- insert/update/delete data
- query data efficiently
- maintain security and consistency

Examples: MySQL, PostgreSQL, Oracle, SQL Server, SQLite.

### 1.4 Why Not Just Use Excel or Files?
File-based systems have issues:
- Data redundancy (same data repeated in many places)
- Data inconsistency (different values for same fact)
- No strict relationships between files
- Difficult concurrent access
- Weak security and backup control

DBMS solves these by schema, constraints, transactions, and controlled access.

---

## 2) DBMS Architecture and Users

### 2.1 Three-Level Architecture
- External level: User views (what each user sees)
- Conceptual level: Logical structure of whole DB
- Internal level: Physical storage details

Benefit: **Data independence**
- Logical data independence: change logical design without changing user views much.
- Physical data independence: change storage/indexing without changing queries.

### 2.2 DBMS Users
- DBA (Database Administrator): security, backups, tuning
- Developers: build application using DB
- End users: use app/UI
- Analysts: run reports and queries

---

## 3) Data Models and RDBMS

### 3.1 Data Model
A data model defines how data is structured and related.

Common models:
- Hierarchical model
- Network model
- Relational model (most used)

### 3.2 Relational Model
Data is stored in tables (relations).
- Row = tuple/record
- Column = attribute/field

A relational database uses tables connected via keys.

---

## 4) Key Concepts: Schema, Instance, Degree, Cardinality

- Schema: blueprint/design of database (table definitions)
- Instance: actual data at a specific time
- Degree: number of columns in a table
- Cardinality (table context): number of rows in a table

Do not confuse with ER cardinality (1:1, 1:N, M:N).

---

## 5) Keys in Detail (Very Important)

### 5.1 Super Key
Any column/set of columns that uniquely identifies a row.
Example in `Students(student_id, email, phone)`: `{student_id}`, `{email}`, `{student_id,email}` all can be super keys if unique.

### 5.2 Candidate Key
Minimal super key (no extra attribute).
Example: `student_id`, `email`.

### 5.3 Primary Key
One candidate key selected as main unique identifier.
Properties:
- unique
- not null
- stable (should not change often)

### 5.4 Alternate Key
Candidate keys not chosen as primary key.

### 5.5 Composite Key
Key made of multiple columns.
Example: `(student_id, course_id)` in `Enrollments`.

### 5.6 Foreign Key
Column that references primary key in another table.
Purpose:
- establish relationship
- enforce referential integrity

---

## 6) Constraints (Rules to Protect Data)

- `NOT NULL`: value required
- `UNIQUE`: no duplicate values
- `PRIMARY KEY`: unique + not null
- `FOREIGN KEY`: relationship rule
- `CHECK`: condition on value range
- `DEFAULT`: fallback value if not provided

Example:
```sql
CREATE TABLE Employees (
    emp_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE,
    salary DECIMAL(10,2) CHECK (salary > 0),
    department VARCHAR(50) DEFAULT 'General'
);
```

---

## 7) SQL Language Categories

### 7.1 DDL (Data Definition Language)
Defines structure:
- `CREATE`
- `ALTER`
- `DROP`
- `TRUNCATE`
- `RENAME`

### 7.2 DML (Data Manipulation Language)
Changes data:
- `INSERT`
- `UPDATE`
- `DELETE`

### 7.3 DQL (Data Query Language)
- `SELECT`

### 7.4 DCL (Data Control Language)
- `GRANT`
- `REVOKE`

### 7.5 TCL (Transaction Control Language)
- `COMMIT`
- `ROLLBACK`
- `SAVEPOINT`

---

## 8) SQL from Basics to Intermediate

### 8.1 Create Database and Use It
```sql
CREATE DATABASE CollegeDB;
USE CollegeDB;
```

### 8.2 Create Tables
```sql
CREATE TABLE Students (
    student_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    dept VARCHAR(50),
    age INT CHECK (age >= 16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Courses (
    course_id INT PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    credits INT CHECK (credits BETWEEN 1 AND 6)
);

CREATE TABLE Enrollments (
    enrollment_id INT PRIMARY KEY,
    student_id INT,
    course_id INT,
    marks INT CHECK (marks BETWEEN 0 AND 100),
    FOREIGN KEY (student_id) REFERENCES Students(student_id),
    FOREIGN KEY (course_id) REFERENCES Courses(course_id)
);
```

### 8.3 Insert Records
```sql
INSERT INTO Students (student_id, name, email, dept, age)
VALUES
(1, 'Asha', 'asha@example.com', 'CSE', 20),
(2, 'Rohan', 'rohan@example.com', 'ECE', 21),
(3, 'Meera', 'meera@example.com', 'CSE', 19);

INSERT INTO Courses (course_id, course_name, credits)
VALUES
(101, 'DBMS', 4),
(102, 'OS', 4),
(103, 'CN', 3);

INSERT INTO Enrollments (enrollment_id, student_id, course_id, marks)
VALUES
(1, 1, 101, 92),
(2, 1, 102, 88),
(3, 2, 101, 75),
(4, 3, 103, 81);
```

### 8.4 SELECT Queries
```sql
SELECT * FROM Students;
SELECT name, dept FROM Students;
SELECT * FROM Students WHERE dept = 'CSE';
SELECT * FROM Students WHERE age > 19;
SELECT * FROM Students ORDER BY age DESC;
SELECT DISTINCT dept FROM Students;
```

### 8.5 Aggregate Functions + GROUP BY
```sql
SELECT COUNT(*) AS total_students FROM Students;
SELECT AVG(age) AS avg_age FROM Students;
SELECT dept, COUNT(*) AS dept_count
FROM Students
GROUP BY dept;
```

### 8.6 HAVING
Use HAVING after GROUP BY for grouped filters.
```sql
SELECT dept, COUNT(*) AS dept_count
FROM Students
GROUP BY dept
HAVING COUNT(*) >= 2;
```

### 8.7 UPDATE and DELETE
```sql
UPDATE Students
SET dept = 'IT'
WHERE student_id = 2;

DELETE FROM Enrollments
WHERE enrollment_id = 4;
```

---

## 9) Joins Explained with Meaning

### 9.1 INNER JOIN
Only matching rows from both tables.
```sql
SELECT s.name, c.course_name, e.marks
FROM Enrollments e
INNER JOIN Students s ON e.student_id = s.student_id
INNER JOIN Courses c ON e.course_id = c.course_id;
```

### 9.2 LEFT JOIN
All rows from left table, matching from right.
```sql
SELECT s.name, e.course_id
FROM Students s
LEFT JOIN Enrollments e ON s.student_id = e.student_id;
```

### 9.3 RIGHT JOIN
All rows from right table, matching from left.

### 9.4 FULL OUTER JOIN
All rows from both tables (MySQL doesn’t support directly; use UNION approach).

### 9.5 SELF JOIN
Join a table with itself.
Example use case: employee-manager in same table.

---

## 10) Subqueries

### 10.1 Single-Row Subquery
```sql
SELECT name
FROM Students
WHERE student_id = (
    SELECT student_id
    FROM Enrollments
    WHERE marks = (SELECT MAX(marks) FROM Enrollments)
    LIMIT 1
);
```

### 10.2 IN Subquery
```sql
SELECT name
FROM Students
WHERE student_id IN (
    SELECT student_id FROM Enrollments WHERE marks > 85
);
```

---

## 11) Normalization in Depth

### 11.1 Why Normalization?
Prevents anomalies:
- Insertion anomaly
- Update anomaly
- Deletion anomaly

### 11.2 1NF
Rules:
- no multi-valued fields
- each cell contains atomic value

Bad:
- one row storing `course_ids = 101,102,103`

Good:
- separate rows or junction table.

### 11.3 2NF
Must be in 1NF + no partial dependency on composite key.
If PK is `(student_id, course_id)`, non-key columns must depend on full key, not only one part.

### 11.4 3NF
Must be in 2NF + no transitive dependency.
Non-key should depend only on key, not on another non-key.

### 11.5 BCNF
For every functional dependency X -> Y, X must be a candidate key.

Practical exam tip:
- Usually up to 3NF is enough for most semester exams/labs.

---

## 12) Transactions and Concurrency

### 12.1 Transaction
A set of SQL operations treated as one unit.

Bank transfer example:
1. Debit from A
2. Credit to B
If step 2 fails, step 1 must undo.

### 12.2 ACID
- Atomicity: complete or rollback
- Consistency: rules always maintained
- Isolation: concurrent execution appears safe
- Durability: committed data persists

### 12.3 TCL Example
```sql
START TRANSACTION;
UPDATE Accounts SET balance = balance - 1000 WHERE acc_id = 1;
SAVEPOINT after_debit;
UPDATE Accounts SET balance = balance + 1000 WHERE acc_id = 2;
COMMIT;
```

If something fails:
```sql
ROLLBACK TO after_debit;
-- or full ROLLBACK;
```

### 12.4 Concurrency Problems
- Dirty read
- Non-repeatable read
- Phantom read

Isolation levels (concept):
- Read Uncommitted
- Read Committed
- Repeatable Read
- Serializable

---

## 13) Indexing

### 13.1 What is Index?
An index is a data structure that speeds up lookup.
Think of it as book index: jump directly to page.

### 13.2 Why Needed?
Without index, DB may scan full table (full table scan).
With index, search can be much faster.

### 13.3 Tradeoff
- Faster reads
- Slower writes (insert/update/delete)
- Extra storage

### 13.4 Example
```sql
CREATE INDEX idx_enrollments_student_id
ON Enrollments(student_id);
```

Use index on:
- columns in `WHERE`
- join keys
- frequently sorted fields

---

## 14) Views, Procedures, Triggers (Intro)

### 14.1 View
Virtual table from a query.
```sql
CREATE VIEW cse_students AS
SELECT student_id, name
FROM Students
WHERE dept = 'CSE';
```

### 14.2 Stored Procedure
Predefined SQL block saved in DB (DBMS-specific syntax).

### 14.3 Trigger
Auto-executes on event (`INSERT`, `UPDATE`, `DELETE`).
Use carefully.

---

## 15) MySQL Workbench EER Diagrams (Detailed)

### 15.1 What is EER?
EER = Enhanced Entity Relationship model.
It visually shows:
- entities/tables
- attributes/columns
- primary and foreign keys
- relationships and cardinality

### 15.2 Diagram Terms
- Entity: table
- Attribute: column
- PK: unique identifier
- FK: relation connector
- Relationship line: association between tables

### 15.3 Cardinality (Very Important)
- 1:1 one student has one locker and one locker belongs to one student
- 1:N one department has many students
- M:N many students take many courses

For M:N, always create bridge/junction table.

### 15.4 Optionality
- Mandatory: record must exist
- Optional: may be null/no related record

### 15.5 How to Read Any EER Quickly
1. Identify strong entities (main tables)
2. Mark all primary keys
3. Mark all foreign keys
4. Find junction tables (usually only FKs + maybe extra attributes)
5. Describe each relationship in sentence form

Example sentence:
- One student can have many enrollments.
- One course can have many enrollments.
- Therefore students and courses are many-to-many via enrollments.

### 15.6 Building EER in MySQL Workbench
1. Open Workbench -> Model
2. Add schema
3. Add tables with datatypes
4. Set PK for each table
5. Add FK relationships
6. Check relationship lines/cardinality
7. Validate model
8. Forward Engineer to create actual DB

### 15.7 Reverse Engineering
If DB already exists:
- Database -> Reverse Engineer
- select connection/schema
- Workbench auto-creates EER diagram

Great for understanding legacy databases.

---

## 16) Complete Mini Schema for Practice

```sql
CREATE TABLE Departments (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Students (
    student_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INT CHECK (age >= 16),
    dept_id INT,
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE Courses (
    course_id INT PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    dept_id INT,
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE Enrollments (
    student_id INT,
    course_id INT,
    semester VARCHAR(20),
    marks INT CHECK (marks BETWEEN 0 AND 100),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id),
    FOREIGN KEY (course_id) REFERENCES Courses(course_id)
);
```

Try these:
- List all CSE students and their course names
- Find top 3 scorers
- Count students per department
- Find courses with no enrollments

---

## 17) 40 Viva Questions (Short Crisp Answers)

1. What is DBMS?
Software to define, store, retrieve, and manage data in databases.

2. What is RDBMS?
A DBMS based on relational tables and keys.

3. Difference between DBMS and RDBMS?
RDBMS uses related tables with constraints; DBMS may not strictly enforce relational rules.

4. What is a table?
Structured data in rows and columns.

5. What is a tuple?
A row/record in a table.

6. What is an attribute?
A column/field in a table.

7. What is a primary key?
Unique non-null identifier for each row.

8. What is a foreign key?
Column referencing PK in another table.

9. What is a candidate key?
Minimal key that can uniquely identify rows.

10. What is a super key?
Any key combination that uniquely identifies rows.

11. What is a composite key?
Primary key made using multiple columns.

12. What is schema?
Logical structure/design of database.

13. What is instance?
Current data stored at a specific time.

14. What are constraints?
Rules to ensure valid data.

15. What is NOT NULL?
Column cannot store null.

16. What is UNIQUE?
No duplicate values allowed.

17. What is CHECK constraint?
Validates condition on inserted/updated values.

18. What is DEFAULT?
Automatic value if none provided.

19. What is normalization?
Organizing data to reduce redundancy.

20. Define 1NF.
Atomic values, no repeating groups.

21. Define 2NF.
1NF + no partial dependency on composite key.

22. Define 3NF.
2NF + no transitive dependency.

23. What is BCNF?
Every determinant must be a candidate key.

24. What is denormalization?
Intentional redundancy for performance.

25. What is SQL?
Language to interact with relational databases.

26. DDL examples?
CREATE, ALTER, DROP, TRUNCATE.

27. DML examples?
INSERT, UPDATE, DELETE.

28. TCL examples?
COMMIT, ROLLBACK, SAVEPOINT.

29. What is a join?
Combining rows from multiple tables based on relation.

30. Difference between INNER and LEFT JOIN?
INNER gives only matches; LEFT gives all left rows + matches.

31. What is GROUP BY?
Groups rows for aggregate calculations.

32. What is HAVING?
Filters grouped results after GROUP BY.

33. What is an index?
Structure that speeds up retrieval.

34. Drawback of many indexes?
Slower insert/update/delete and more storage.

35. What is a transaction?
Set of operations treated as one logical unit.

36. What is ACID?
Atomicity, Consistency, Isolation, Durability.

37. What is referential integrity?
FK values must refer to existing PK rows.

38. What is cardinality in ER model?
Relationship ratios: 1:1, 1:N, M:N.

39. What is a weak entity?
Entity dependent on another entity for identification.

40. What is MySQL Workbench used for?
Design schema, run SQL queries, and visualize EER diagrams.

---

## 18) 10 Common Mistakes Students Make
- Forgetting PK in a table
- Wrong FK reference column
- Storing multiple values in one column
- Using text instead of numeric datatype for numbers
- Writing joins without ON condition
- Confusing WHERE vs HAVING
- Using DELETE when TRUNCATE/DROP intended
- Not handling NULL properly
- Over-indexing every column
- Ignoring transaction rollback logic

---

## 19) 7-Day Detailed Study Plan

Day 1:
- DBMS basics, architecture, users, schema vs instance

Day 2:
- Keys + constraints + table creation practice

Day 3:
- SELECT, WHERE, ORDER BY, GROUP BY, HAVING

Day 4:
- Joins + subqueries + set operations

Day 5:
- Normalization (1NF to 3NF/BCNF) + anomalies

Day 6:
- Transactions, ACID, concurrency, indexing

Day 7:
- MySQL Workbench EER diagrams + 40 viva Q revision

Daily practice target:
- 20 SQL queries
- 5 viva answers aloud
- 1 ER diagram drawing

---

## 20) Final Revision Cheatsheet
- PK identifies row
- FK connects tables
- Joins fetch combined data
- Normalization reduces redundancy
- ACID protects correctness
- Index improves read speed
- EER diagrams show structure + relationships

If you master these 7 points, your DBMS foundation becomes strong.

---

## 21) Normalization Forms Used in This Project (Maxfit)

Based on your current schema (`backend/schema.sql` and subscription tables in `backend/app.py`), this is how normalization appears in your project.

### 21.1 Quick Project Summary
Main tables:
- `Users`
- `Attendance`
- `Progress`
- `Schedule`
- `Badges`
- `Payment`
- `WorkoutPlan`
- `MealPlan`
- `MemberSubscriptions`
- `MemberSubscriptionHistory`

Most tables use surrogate primary keys (`*_id`) and foreign keys to `Users(user_id)`.

### 21.2 1NF in Your Project
Your project is mostly in **1NF** because:
- Columns are mostly atomic (single values)
- No comma-separated repeating lists are stored in one column
- Each table has a clear primary key

Where to be careful:
- `workout_details` and `meal_details` are `TEXT`. This is okay for free-form notes, but if you store multiple structured exercises/meals inside one text field, it can reduce queryability.

### 21.3 2NF in Your Project
Your tables are effectively in **2NF** because:
- Most tables use single-column primary keys (`user_id`, `payment_id`, `schedule_id`, etc.)
- Partial dependency issue mainly occurs with composite keys; your design rarely uses composite PKs

One good composite design example:
- `Attendance` has unique `(user_id, date)`, which correctly models one attendance per member per day.

### 21.4 3NF in Your Project
Your schema is **largely near 3NF**, but a few places can be improved.

Good parts:
- Transactional/event data is separated into dedicated tables (`Attendance`, `Progress`, `Payment`, etc.)
- Foreign keys maintain referential integrity.

Potential 3NF concerns:

1. Derived/Calculated data stored in base tables
- In `Users`: `bmi` can be derived from `height` and `weight`.
- In `MemberSubscriptions`: fields like `base_price`, `discount_amount`, `final_plan_price`, and `total_price` are derivable from plan inputs.

Why this matters:
- If source values change, derived values can become inconsistent (update anomaly).

2. Plan master data repeated in each subscription row
- `plan_code`, `plan_name`, `duration_months`, `monthly_rate`, `discount_percent` are plan-definition attributes.
- These belong naturally to a `Plans` master table and should be referenced by `plan_code`/`plan_id`.

Why this matters:
- If plan details change globally, repeated rows are harder to keep consistent.

3. Role-specific fields mixed in `Users`
- `Users` contains profile fields plus membership/trainer-related state.
- This is workable for small apps, but larger systems often split into:
  - `Users` (identity)
  - `MemberProfile`
  - `TrainerProfile`
  - `Membership`/`Subscription`

### 21.5 Is BCNF Required Here?
Not mandatory for your current project scope.
For academic projects and production MVPs, strong 3NF with practical denormalization is usually enough.

### 21.6 Current NF Verdict for Maxfit
- `Attendance`, `Progress`, `Badges`, `Schedule`, `Payment`: generally **1NF/2NF/near-3NF**
- `Users`: mostly normalized, but includes a few derived and multi-domain attributes
- `MemberSubscriptions`: practical design, but partially denormalized for pricing snapshots and reporting
- `MemberSubscriptionHistory`: intentionally denormalized audit/history table (this is acceptable and common)

### 21.7 Suggested Improvements (If You Want Better 3NF)

1. Create a `Plans` table
```sql
CREATE TABLE Plans (
    plan_code VARCHAR(50) PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    duration_months INT NOT NULL,
    monthly_rate DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0
);
```
Then keep only reference + transaction snapshot fields in subscriptions.

2. Treat `bmi` as derived
- Either compute on read in backend
- Or keep it as cached value but document it as derived and refresh whenever height/weight changes

3. Consider profile split later
- Keep `Users` for login/auth identity
- Move heavy member/trainer-specific fields to profile tables as the app grows

### 21.8 Viva Style Answer for “Which NF is your project in?”
You can answer:

"Our project schema is mostly normalized up to 3NF for operational tables like attendance, progress, schedule, and payments. We use primary and foreign keys to enforce integrity. Some parts, such as subscription pricing and history snapshots, are intentionally denormalized for auditability and faster reporting."

This answer is realistic and technically strong.
