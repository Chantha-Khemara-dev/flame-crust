import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Test email')
msg['Subject'] = 'Test'
msg['From'] = 'chanthakhemara12@gmail.com'
msg['To'] = 'chanthakhemara12@gmail.com'

try:
    s = smtplib.SMTP('smtp.gmail.com', 587)
    s.starttls()
    s.login('chanthakhemara12@gmail.com', 'yklkawmryphjodct')
    s.send_message(msg)
    s.quit()
    print("Success")
except Exception as e:
    print("Error:", e)
