import smtplib
from email.mime.text import MIMEText
import os

sender = "chanthakhemara12@gmail.com"
password = "yklkawmryphjodct"
receiver = "chanthakhemara12@gmail.com"

msg = MIMEText("Test email from Python")
msg['Subject'] = 'Test'
msg['From'] = sender
msg['To'] = receiver

try:
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
    print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email: {e}")
