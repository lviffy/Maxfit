# Gym Management System - Run Instructions

Here are the step-by-step instructions to get your Flask application up and running!

## 1. Install Dependencies
Open your Command Prompt or PowerShell, navigate to the `gym_project` folder, and run:
```bash
pip install flask mysql-connector-python qrcode pillow razorpay
```

## 2. Setup the Database
1. Open your MySQL client (e.g., MySQL Workbench, phpMyAdmin, or command line).
2. Run the provided `schema.sql` script to create the database and tables.
3. Open `app.py` and update the `password='YOUR_PASSWORD'` placeholder with your actual MySQL root password.

## 3. Run the Flask App
In your terminal, navigate to the `gym_project` folder and run:
```bash
python app.py
```

## 4. Open in Browser
Open your web browser and go to the following URL:
[http://127.0.0.1:5000/](http://127.0.0.1:5000/)

## 5. Next Steps to Test
Once you see `* Running on http://127.0.0.1:5000` in your terminal, it means the backend is up and listening.

1. Open your web browser (Chrome, Edge, or Firefox).
2. Go to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**. You should see "App Running Successfully".
3. Navigate to **[http://127.0.0.1:5000/register](http://127.0.0.1:5000/register)** to test creating a new user.
4. Navigate to **[http://127.0.0.1:5000/test-db](http://127.0.0.1:5000/test-db)** to verify the user was actually inserted into your MySQL database!

Keep the terminal window open while you test. You can close it anytime by pressing `CTRL + C` in the terminal to shut down the server.

Enjoy building your Gym Management System!
