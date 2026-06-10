import { ChatWidget } from "./components/ChatWidget";

export default function App() {
  return (
    <main className="app">
      <div className="app__backdrop" aria-hidden="true">
        <div className="app__orb app__orb--1" />
        <div className="app__orb app__orb--2" />
        <div className="app__orb app__orb--3" />
      </div>
      <div className="app__content">
        <p className="app__tagline">Customer Support</p>
        <ChatWidget />
      </div>
    </main>
  );
}
