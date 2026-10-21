import React from 'react';
import { ArrowUpRight, DoorOpen, Layers3, Sparkles } from 'lucide-react';
import { rooms } from './rooms';
import routeManagerIcon from './assets/route-manager-icon.png';

export default function Hallway() {
  return <div className="hallway">
    <header className="hallway-header"><div className="brand"><span className="brand-icon"><Layers3 aria-hidden="true" size={22} /></span><div><strong>All in One</strong><p>Your software, one place</p></div></div></header>
    <main>
      <p className="eyebrow"><DoorOpen size={16} aria-hidden="true" />Main menu</p>
      <h1>Your hallway.</h1>
      <p className="intro">Choose a room to get started. Each software has its own workspace. Come back here whenever you want to switch.</p>
      <section className="rooms" aria-label="Software rooms">
        {rooms.map(room => <a className="room" href={room.href} key={room.id} aria-label={`Open ${room.name}`}>
          <span className="room-top"><span className={`room-icon ${room.id === 'route-manager' ? 'room-icon-branded' : ''}`}>{room.id === 'cleaning' ? <Sparkles size={28} aria-hidden="true" /> : <img src={routeManagerIcon} width={52} height={52} alt="" />}</span><span className="available"><i />Available</span></span>
          <h2>{room.name}</h2><p>{room.description}</p>
          <span className="enter">Enter room <ArrowUpRight size={18} aria-hidden="true" /></span>
        </a>)}
      </section>
    </main>
  </div>;
}
