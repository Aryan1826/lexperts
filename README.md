# ⚖️ LExperts - Online Expert Consultation Platform

LExperts is a full-stack web application that connects users with verified professionals such as lawyers, doctors, consultants, and other domain experts. The platform enables secure booking, online consultation, appointment scheduling, and payment processing through a modern and scalable architecture.

---

## 🚀 Features

- User Authentication & Authorization (JWT)
- Role-Based Access Control
  - Client
  - Expert
  - Admin
- Expert Registration & Verification
- Search and Filter Experts
- Appointment Booking System
- Video Consultation Integration (Jitsi Meet)
- Secure Online Payments
- Admin Dashboard
- Responsive User Interface
- Profile Management
- Booking History
- Notification Support
- Dockerized Deployment
- CI/CD using GitHub Actions

---

## 🛠 Tech Stack

### Frontend
- Next.js
- React.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- Redis (Caching)

### Payment Gateway
- Stripe
- Razorpay (Test Mode)

### DevOps & Cloud
- Docker
- Docker Compose
- GitHub Actions
- AWS EC2

### Video Communication
- Jitsi Meet

---

## 📁 Project Structure

```
LExperts
│
├── client/
│   ├── components/
│   ├── app/
│   ├── public/
│   └── styles/
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/Aryan1826/lexperts.git
cd lexperts
```

### Install Dependencies

Backend

```bash
cd server
npm install
```

Frontend

```bash
cd client
npm install
```

---

## Environment Variables

Create a `.env` file in the server directory.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
STRIPE_SECRET_KEY=your_key
REDIS_URL=your_redis_url
```

---

## Run Locally

Backend

```bash
npm run dev
```

Frontend

```bash
npm run dev
```

---

## Docker Deployment

```bash
docker-compose up --build
```

---

## Future Enhancements

- AI-based Expert Recommendation
- Real-Time Chat
- Email Notifications
- Google Calendar Integration
- Multi-language Support
- Rating & Review System
- Mobile Application

---

## Learning Outcomes

This project helped in gaining practical experience with:

- Full Stack Development
- REST API Development
- Authentication & Authorization
- Payment Gateway Integration
- Docker
- AWS Deployment
- CI/CD Pipelines
- MongoDB Database Design

---

## Contributors

**Aryan Patel**

---

## License

This project is developed for educational and portfolio purposes.
