import axios from "axios";

export const sendChatMessage = async (text) => {
  const res = await axios.post("http://localhost:5000/api/chat", {
    message: text,
  });
  return res.data.reply;
};
