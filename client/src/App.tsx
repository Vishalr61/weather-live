import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function Login() {
  return <div>Login</div>;
}

function Home() {
  return <div>Home</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
