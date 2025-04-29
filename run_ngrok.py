from pyngrok import ngrok
import subprocess
import os
# Add this line before creating tunnels
ngrok.set_auth_token("2pevURo0F82PRQgvKPqblufURRE_2Z1eQgdzdpa5cajvTH7mA")
# Start Flask server in background
flask_process = subprocess.Popen(['python', 'backend/app.py'])

# Set up Ngrok tunnel
public_url = ngrok.connect(5000, bind_tls=True)
print(f" * Ngrok URL: {public_url}")

try:
    flask_process.wait()
except KeyboardInterrupt:
    flask_process.terminate()
    ngrok.kill()