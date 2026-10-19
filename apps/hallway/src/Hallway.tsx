import React from 'react';
import { ArrowUpRight, DoorOpen, Layers3, Route } from 'lucide-react';
import { rooms } from './rooms';

export default function Hallway() {
  return <div className="hallway">
    <header className="hallway-header"><div className="brand"><span className="brand-icon"><Layers3 aria-hidden="true" size={22} /></span><div><strong>All in One</strong><p>Your software, one place</p></div></div></header>
    <main>
      <p className="eyebrow"><DoorOpen size={16} aria-hidden="true" />Main menu</p>
      <h1>Your hallway.</h1>
      <p className="intro">Choose a room to get started. Each software has its own workspace. Come back here whenever you want to switch.</p>
      <section className="rooms" aria-label="Software rooms">
        {rooms.map(room => <a className="room" href={room.href} key={room.id} aria-label={`Open ${room.name}`}>
          <span className="room-top"><span className="room-icon"><Route size={28} aria-hidden="true" /></span><span className="available"><i />Available</span></span>
          <h2>{room.name}</h2><p>{room.description}</p>
          <span className="enter">Enter room <ArrowUpRight size={18} aria-hidden="true" /></span>
        </a>)}
        <div className="future-room"><h2>Room to grow.</h2><p>More software can have a place here as you add it.</p></div>
      </section>
    </main>
  </div>;
}
