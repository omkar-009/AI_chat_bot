import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";
import "./auth.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load previous history after login
  const loadHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://backendaichatbot.in/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
    } catch (err) {
      console.log("History error", err);
    }
  };

  const loginUser = async () => {
    try {
      const res = await axios.post("http://backendaichatbot.in/api/login", {
        username,
        contact_no: contactNo,
        password,
      });
  
      localStorage.setItem("token", res.data.token);
      setAuthenticated(true);
      setShowLogin(false);
      loadHistory();
    } catch (err) {
      alert("Login failed");
    }
  };

  const registerUser = async () => {
    try {
      await axios.post("http://backendaichatbot.in/api/register", {
        username,
        contact_no: contactNo,
        password,
      });
  
      alert("Registered! Now login.");
      setShowRegister(false);
      setShowLogin(true);
    } catch (err) {
      alert("User already exists");
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/chat",
        { message: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = { role: "assistant", text: response.data.reply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Error sending message" },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="chat-container">
      {!authenticated && (
        <div className="auth-buttons">
          <button onClick={() => setShowLogin(true)}>Login</button>
          <button onClick={() => setShowRegister(true)}>Register</button>
        </div>
      )}

      <h2 className="title">⚡ AI Neon Chat</h2>

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message ${msg.role === "user" ? "user-msg" : "bot-msg"}`}
          >
            {msg.text}
          </div>
        ))}
        {loading && <div className="loading">AI is typing...</div>}
        <div ref={bottomRef}></div>
      </div>

      {authenticated && (
        <div className="input-area">
          <input
            type="text"
            placeholder="Type something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="modal">
          <div className="modal-box">
            <h3>Login</h3>
      
            <input
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
            />
      
            <input
              placeholder="Contact number"
              onChange={(e) => setContactNo(e.target.value)}
            />
      
            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />
      
            <button onClick={loginUser}>Login</button>
      
            <p
              onClick={() => {
                setShowLogin(false);
                setShowRegister(true);
              }}
            >
              New here? Register
            </p>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegister && (
        <div className="modal">
          <div className="modal-box">
            <h3>Register</h3>

            <input
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              placeholder="Contact number"
              onChange={(e) => setContactNo(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={registerUser}>Create Account</button>

            <p
              onClick={() => {
                setShowRegister(false);
                setShowLogin(true);
              }}
            >
              Already have an account?
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
