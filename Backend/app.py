from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib
import jwt
import datetime
import os
from dotenv import load_dotenv
load_dotenv()  


app = Flask(__name__)
CORS(app)  

app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

users_db = {
    'demo@test.com': {
        'password': hashlib.sha256('password123'.encode()).hexdigest(),
        'name': 'Demo User'
    }
}

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', 'User')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
            
        if email in users_db:
            return jsonify({'error': 'User already exists'}), 400
            
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Store user
        users_db[email] = {
            'password': hashed_password,
            'name': name
        }
        
        token = jwt.encode({
            'email': email,
            'name': name,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'email': email,
                'name': name
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
            
        if email not in users_db:
            return jsonify({'error': 'Invalid credentials'}), 401
            
        # Check password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        if users_db[email]['password'] != hashed_password:
            return jsonify({'error': 'Invalid credentials'}), 401
            
        # Generate JWT token
        token = jwt.encode({
            'email': email,
            'name': users_db[email]['name'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'email': email,
                'name': users_db[email]['name']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify', methods=['GET'])
def verify_token():
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
            
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        # Verify token
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        
        return jsonify({
            'user': {
                'email': data['email'],
                'name': data['name']
            }
        }), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cars', methods=['GET'])
def get_cars():
    cars = [
        {'id': 1, 'lat': 10.7905, 'lng': 78.7047, 'type': 'economy'},
        {'id': 2, 'lat': 10.7915, 'lng': 78.7057, 'type': 'premium'},
        {'id': 3, 'lat': 10.7885, 'lng': 78.7037, 'type': 'economy'},
        {'id': 4, 'lat': 10.7925, 'lng': 78.7067, 'type': 'suv'},
        {'id': 5, 'lat': 10.7875, 'lng': 78.7027, 'type': 'premium'},
        {'id': 6, 'lat': 10.7935, 'lng': 78.7077, 'type': 'economy'},
    ]
    return jsonify(cars)

@app.route('/api/search', methods=['POST'])
def search_locations():
    try:
        data = request.get_json()
        query = data.get('query', '').lower()
        
        locations = [
            {'name': 'Airport', 'lat': 10.7654, 'lng': 78.7097},
            {'name': 'Railway Station', 'lat': 10.8066, 'lng': 78.7007},
            {'name': 'Bus Stand', 'lat': 10.8276, 'lng': 78.6937},
            {'name': 'Hospital', 'lat': 10.7906, 'lng': 78.7147},
            {'name': 'Mall', 'lat': 10.8006, 'lng': 78.6847},
            {'name': 'University', 'lat': 10.7556, 'lng': 78.7247},
            {'name': 'Temple', 'lat': 10.8156, 'lng': 78.7097},
            {'name': 'Market', 'lat': 10.8226, 'lng': 78.6947}
        ]
        
        if query:
            filtered_locations = [loc for loc in locations if query in loc['name'].lower()]
        else:
            filtered_locations = locations[:5]  # Return first 5 if no query
            
        return jsonify(filtered_locations)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask backend server...")
    print("Backend running on http://localhost:5000")
    print("Available endpoints:")
    print("  POST /api/register - User registration")
    print("  POST /api/login - User login")
    print("  GET /api/verify - Verify JWT token")
    print("  GET /api/cars - Get dummy car locations")
    print("  POST /api/search - Search locations")
    app.run(debug=True, port=5000)