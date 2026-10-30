import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Clock3,
  Music2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogIn,
  LogOut,
  UserRound,
  Settings,
  LayoutDashboard,
  Upload,
  Users,
  Disc3,
  TrendingUp,
  Headphones,
  Check,
  LockKeyhole,
} from "lucide-react";
const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const fmt = (s = 0) =>
  `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;
const idOf = (x) => (typeof x === "string" ? x : x?._id);
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
const authHeaders = (u) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${u?.token}`,
});
function App() {
  const [allTracks, setAllTracks] = useState([]),
    [allPlaylists, setAllPlaylists] = useState([]);
  const [current, setCurrent] = useState({}),
    [playing, setPlaying] = useState(false),
    [progress, setProgress] = useState(0),
    [duration, setDuration] = useState(0),
    [volume, setVolume] = useState(0.75),
    [shuffle, setShuffle] = useState(false),
    [repeat, setRepeat] = useState(false);
  const [queue, setQueue] = useState(null),
    [liked, setLiked] = useState([]),
    [query, setQuery] = useState(""),
    [user, setUser] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("sw_user"));
      } catch {
        return null;
      }
    });
  const [authOpen, setAuthOpen] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [toast, setToast] = useState(""),
    [mobileNav, setMobileNav] = useState(false);
  const audio = useRef(null),
    navigate = useNavigate(),
    loc = useLocation();
  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/tracks`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Could not load tracks")),
      ),
      fetch(`${API}/playlists`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Could not load playlists")),
      ),
    ])
      .then(([tracks, playlists]) => {
        if (alive) {
          setAllTracks(Array.isArray(tracks) ? tracks : []);
          setAllPlaylists(Array.isArray(playlists) ? playlists : []);
          setCurrent(Array.isArray(tracks) && tracks.length ? tracks[0] : {});
        }
      })
      .catch(() => {
        if (alive) {
          setAllTracks([]);
          setAllPlaylists([]);
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!audio.current) return;
    audio.current.volume = volume;
    if (playing) audio.current.play().catch(() => setPlaying(false));
    else audio.current.pause();
  }, [playing, current, volume]);
  const nextRef = useRef(() => {});
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const tick = () => setProgress(a.currentTime || 0),
      meta = () => setDuration(a.duration || current.duration || 0),
      ended = () => {
        if (repeat) {
          a.currentTime = 0;
          a.play().catch(() => {});
        } else nextRef.current();
      };
    a.addEventListener("timeupdate", tick);
    a.addEventListener("loadedmetadata", meta);
    a.addEventListener("ended", ended);
    return () => {
      a.removeEventListener("timeupdate", tick);
      a.removeEventListener("loadedmetadata", meta);
      a.removeEventListener("ended", ended);
    };
  }, [current, repeat]);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const fail = () => {
      setPlaying(false);
      notify("This track could not be loaded. Check its audio URL.");
    };
    a.addEventListener("error", fail);
    return () => a.removeEventListener("error", fail);
  }, []);
  useEffect(() => {
    if (!user?.token) return;
    fetch(`${API}/auth/me`, { headers: authHeaders(user) })
      .then((r) => {
        if (r.status === 401) {
          setUser(null);
          notify("Session expired. Please log in again.");
        } else if (r.ok)
          return r
            .json()
            .then((d) => setUser((u) => (u ? { ...u, ...d.user } : u)));
      })
      .catch(() => {});
  }, [user?.token]);
  useEffect(() => {
    try {
      setLiked(
        JSON.parse(localStorage.getItem("sw_liked_" + (user?.id || "guest"))) ||
          [],
      );
    } catch {
      setLiked([]);
    }
  }, [user?.id]);
  useEffect(() => {
    localStorage.setItem(
      "sw_liked_" + (user?.id || "guest"),
      JSON.stringify(liked),
    );
  }, [liked, user?.id]);
  useEffect(() => {
    if (user) localStorage.setItem("sw_user", JSON.stringify(user));
    else localStorage.removeItem("sw_user");
  }, [user]);
  const list = () => (queue && queue.length ? queue : allTracks);
  const countPlay = (t) => {
    if (t?._id)
      fetch(`${API}/tracks/${t._id}/play`, { method: "POST" }).catch(() => {});
  };
  const playTrack = (t, q) => {
    if (!t) return;
    if (q) setQueue(q);
    else if (!list().some((x) => x._id === t._id)) setQueue(null);
    setCurrent(t);
    setPlaying(true);
    setProgress(0);
    countPlay(t);
  };
  const next = () => {
    const l = list();
    if (!l.length) return;
    const i = l.findIndex((t) => t._id === current?._id);
    let n =
      shuffle && l.length > 1
        ? Math.floor(Math.random() * l.length)
        : (i + 1) % l.length;
    if (shuffle && l.length > 1 && n === i) n = (i + 1) % l.length;
    setCurrent(l[n]);
    setPlaying(true);
    countPlay(l[n]);
  };
  const prev = () => {
    const l = list();
    if (!l.length) return;
    if (audio.current && audio.current.currentTime > 3) {
      audio.current.currentTime = 0;
      return;
    }
    const i = l.findIndex((t) => t._id === current?._id);
    setCurrent(l[(i - 1 + l.length) % l.length]);
    setPlaying(true);
  };
  const toggleLike = (id) =>
    setLiked((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const tracksOf = (p) =>
    (p.trackIds || [])
      .map((x) =>
        typeof x === "string" ? allTracks.find((t) => t._id === x) : x,
      )
      .filter(Boolean);
  const playList = (p) => {
    const items = tracksOf(p);
    if (!items.length) {
      notify("This playlist has no tracks yet.");
      return;
    }
    playTrack(items[0], items);
  };
  const createPlaylist = async () => {
    if (!user) {
      setAuthMode("login");
      setAuthOpen(true);
      notify("Log in to create playlists.");
      return;
    }
    const name = window.prompt("Playlist name");
    if (!name?.trim()) return;
    try {
      const r = await fetch(`${API}/playlists`, {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not create playlist");
      setAllPlaylists((v) => [d, ...v]);
      navigate("/playlist/" + d._id);
      notify("Playlist created.");
    } catch (e) {
      notify(e.message);
    }
  };
  const doAuth = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget),
      body = Object.fromEntries(fd.entries());
    try {
      const r = await fetch(`${API}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Authentication failed");
      setUser({ ...d.user, token: d.token });
      setAuthOpen(false);
      notify("Welcome to Soundwave!");
    } catch (err) {
      notify(
        err.message === "Failed to fetch"
          ? "API unavailable — start the backend server first."
          : err.message,
      );
    }
  };
  const searchResults = useMemo(
    () =>
      allTracks.filter((t) =>
        `${t.title} ${t.artist} ${t.album} ${t.genre}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [allTracks, query],
  );
  const isAdmin = user?.role === "admin";
  const openPremium = () => navigate("/premium");
  const activatePremium = async () => {
    if (!user) {
      setAuthMode("login");
      setAuthOpen(true);
      notify("Log in or create an account to activate Premium.");
      return;
    }
    if (user.subscription === "premium") {
      notify("Your lifetime Premium is already active!");
      return;
    }
    try {
      const r = await fetch(`${API}/auth/premium`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not activate Premium");
      setUser({ ...user, ...d.user, token: user.token });
      notify("Lifetime Premium activated! Enjoy Soundwave.");
    } catch (err) {
      notify(
        err.message === "Failed to fetch"
          ? "Backend unavailable. Start the server to save Premium."
          : err.message,
      );
    }
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "show-mobile" : ""}`}>
        <div className="brand" onClick={() => navigate("/")}>
          <span className="brand-mark">
            <Headphones size={23} />
          </span>
          <span>soundwave</span>
          <button
            className="mobile-close icon-btn"
            onClick={() => setMobileNav(false)}
          >
            <X />
          </button>
        </div>
        <nav className="nav-main">
          <NavLink to="/" end onClick={() => setMobileNav(false)}>
            <Home />
            Home
          </NavLink>
          <NavLink to="/search" onClick={() => setMobileNav(false)}>
            <Search />
            Search
          </NavLink>
          <NavLink to="/library" onClick={() => setMobileNav(false)}>
            <Library />
            Your Library
          </NavLink>
        </nav>
        <div className="side-actions">
          <button onClick={createPlaylist}>
            <span className="square-icon">
              <Plus />
            </span>
            Create playlist
          </button>
          <button onClick={() => navigate("/liked")}>
            <span className="square-icon liked-icon">
              <Heart />
            </span>
            Liked Songs
          </button>
        </div>
        <div className="side-divider" />
        <div className="side-label">YOUR PLAYLISTS</div>
        {allPlaylists.map((p) => (
          <button
            key={p._id}
            className="playlist-link"
            onClick={() => navigate("/playlist/" + p._id)}
          >
            {p.name}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="premium-mini">
            <div className="premium-icon">✦</div>
            <b>Go Premium</b>
            <p>Listen without limits.</p>
            <button onClick={openPremium}>
              Explore plans <ChevronRight size={15} />
            </button>
          </div>
          <div className="side-foot">© 2026 Soundwave</div>
        </div>
      </aside>
      <main className="main-column">
        <header className="topbar">
          <div className="top-left">
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </button>
            <button className="circle-nav" onClick={() => navigate(-1)}>
              <ChevronLeft />
            </button>
            <button className="circle-nav" onClick={() => navigate(1)}>
              <ChevronRight />
            </button>
            {loc.pathname === "/search" && (
              <div className="searchbar">
                <Search size={19} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What do you want to play?"
                />
              </div>
            )}
          </div>
          <div className="top-actions">
            {user ? (
              <>
                <button className="upgrade-btn" onClick={openPremium}>
                  Explore Premium
                </button>
                <button className="avatar" title={user.name}>
                  {(user.name || "U").slice(0, 1).toUpperCase()}
                </button>
                <button
                  className="profile-name"
                  onClick={() => notify(`Signed in as ${user.email}`)}
                >
                  {user.name}
                </button>
                {isAdmin && (
                  <button
                    className="admin-shortcut"
                    onClick={() => navigate("/admin")}
                  >
                    <LayoutDashboard size={16} /> Admin
                  </button>
                )}
                <button
                  className="icon-btn"
                  title="Log out"
                  onClick={() => {
                    setUser(null);
                    notify("Logged out");
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-btn"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthOpen(true);
                  }}
                >
                  Sign up
                </button>
                <button
                  className="login-btn"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </header>
        <div className="page-scroll">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  tracks={allTracks}
                  playlists={allPlaylists}
                  playTrack={playTrack}
                  playList={playList}
                  liked={liked}
                  toggleLike={toggleLike}
                  user={user}
                  openAuth={() => {
                    setAuthMode("signup");
                    setAuthOpen(true);
                  }}
                />
              }
            />
            <Route
              path="/search"
              element={
                <SearchPage
                  query={query}
                  setQuery={setQuery}
                  results={searchResults}
                  genres={[
                    ...new Set(allTracks.map((t) => t.genre).filter(Boolean)),
                  ]}
                  playTrack={(t) => playTrack(t, searchResults)}
                  liked={liked}
                  toggleLike={toggleLike}
                />
              }
            />
            <Route
              path="/library"
              element={
                <LibraryPage
                  playlists={allPlaylists}
                  tracks={allTracks}
                  liked={liked}
                  playTrack={playTrack}
                  playList={playList}
                  user={user}
                  openAuth={() => setAuthOpen(true)}
                />
              }
            />
            <Route
              path="/liked"
              element={
                <LikedPage
                  tracks={allTracks.filter((t) => liked.includes(t._id))}
                  playTrack={playTrack}
                  toggleLike={toggleLike}
                />
              }
            />
            <Route
              path="/playlist/:id"
              element={
                <PlaylistPage
                  playlists={allPlaylists}
                  setPlaylists={setAllPlaylists}
                  tracks={allTracks}
                  user={user}
                  notify={notify}
                  playTrack={playTrack}
                  liked={liked}
                  toggleLike={toggleLike}
                />
              }
            />
            <Route
              path="/premium"
              element={
                <PremiumPage
                  user={user}
                  activatePremium={activatePremium}
                  openAuth={() => {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }}
                />
              }
            />
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminPage
                    tracks={allTracks}
                    setTracks={setAllTracks}
                    playlists={allPlaylists}
                    setPlaylists={setAllPlaylists}
                    notify={notify}
                    user={user}
                  />
                ) : (
                  <AccessPage openAuth={() => setAuthOpen(true)} />
                )
              }
            />
            <Route
              path="*"
              element={
                <HomePage
                  tracks={allTracks}
                  playlists={allPlaylists}
                  playTrack={playTrack}
                  playList={playList}
                  liked={liked}
                  toggleLike={toggleLike}
                  user={user}
                  openAuth={() => {
                    setAuthMode("signup");
                    setAuthOpen(true);
                  }}
                />
              }
            />
          </Routes>
          <Footer />
        </div>
      </main>
      <Player
        current={current}
        playing={playing}
        setPlaying={setPlaying}
        progress={progress}
        duration={duration || current?.duration || 0}
        audio={audio}
        next={next}
        prev={prev}
        volume={volume}
        setVolume={setVolume}
        shuffle={shuffle}
        setShuffle={setShuffle}
        repeat={repeat}
        setRepeat={setRepeat}
        liked={liked}
        toggleLike={toggleLike}
      />
      {authOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setAuthOpen(false)
          }
        >
          <form className="auth-modal" onSubmit={doAuth}>
            <button
              type="button"
              className="modal-close icon-btn"
              onClick={() => setAuthOpen(false)}
            >
              <X />
            </button>
            <div className="auth-logo">
              <Headphones size={32} />
            </div>
            <h2>
              {authMode === "login"
                ? "Log in to Soundwave"
                : "Create your account"}
            </h2>
            <p className="muted">Your next favorite song is waiting.</p>
            {authMode === "signup" && (
              <label>
                Your name
                <input
                  name="name"
                  placeholder="Full name"
                  required
                  minLength="2"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
                minLength="8"
              />
            </label>
            <button className="green-button full" type="submit">
              {authMode === "login" ? "Log in" : "Create account"}
            </button>
            <div className="auth-switch">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  setAuthMode(authMode === "login" ? "signup" : "login")
                }
              >
                {authMode === "login" ? "Sign up" : "Log in"}
              </button>
            </div>
            <p className="tiny muted">
              Demo browsing works without an account. Authentication requires
              the backend.
            </p>
          </form>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      <audio ref={audio} src={current?.audioUrl} preload="metadata" />
    </div>
  );
}
function Section({ title, subtitle, children, action }) {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && (
          <button className="see-all" onClick={action}>
            See all
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
function TrackCard({ track, toggleLike, liked, playTrack }) {
  return (
    <article className="track-card">
      <div className="cover-wrap">
        <img src={track.cover} alt="" loading="lazy" />
        <button
          className="card-play"
          onClick={() => playTrack(track)}
          aria-label={"Play " + track.title}
        >
          <Play fill="currentColor" size={20} />
        </button>
      </div>
      <div className="track-card-title">{track.title}</div>
      <div className="track-card-sub">{track.artist}</div>
      <button
        className={`heart-hover ${liked.includes(track._id) ? "is-liked" : ""}`}
        onClick={() => toggleLike(track._id)}
        aria-label="Like song"
      >
        <Heart
          size={17}
          fill={liked.includes(track._id) ? "currentColor" : "none"}
        />
      </button>
    </article>
  );
}
function PlaylistCard({ item, onPlay, onOpen }) {
  return (
    <article className="playlist-card" onClick={onOpen}>
      <div className="cover-wrap">
        <img src={item.cover} alt="" loading="lazy" />
        <button
          className="card-play"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(item);
          }}
        >
          <Play fill="currentColor" size={20} />
        </button>
      </div>
      <div className="track-card-title">{item.name}</div>
      <div className="track-card-sub">{item.description}</div>
    </article>
  );
}
function HomePage({
  tracks,
  playlists,
  playTrack,
  playList,
  liked,
  toggleLike,
  user,
  openAuth,
}) {
  const navigate = useNavigate();
  return (
    <div className="home-page">
      <div className="welcome-banner">
        <div className="banner-copy">
          <span className="eyebrow">
            <span className="live-dot" /> YOUR SOUND. YOUR WORLD.
          </span>
          <h1>
            Music for
            <br />
            <em>every moment.</em>
          </h1>
          <p>Find your rhythm. Discover your next favorite.</p>
          <div className="banner-actions">
            <button
              className="green-button"
              onClick={() => tracks[0] && playTrack(tracks[0])}
            >
              <Play size={17} fill="currentColor" /> Start listening
            </button>
            <span className="banner-note">
              <Headphones size={16} /> Your soundtrack starts here
            </span>
          </div>
        </div>
        <div className="banner-art">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <div className="art-disc">
            <img src={tracks[0]?.cover} alt="Featured album cover" />
          </div>
          <div className="floating-note note-a">♫</div>
          <div className="floating-note note-b">♪</div>
        </div>
      </div>
      <Section
        title={user ? `Welcome back, ${user.name.split(" ")[0]}` : greeting()}
        subtitle="A little something for your listening mood"
      >
        <div className="quick-grid">
          {playlists.slice(0, 4).map((p, i) => (
            <button
              className="quick-tile"
              key={p._id}
              onClick={() => navigate("/playlist/" + p._id)}
            >
              <img src={p.cover} alt="" />
              <span>{p.name}</span>
              <span className="quick-play">
                <Play fill="currentColor" size={16} />
              </span>
            </button>
          ))}
        </div>
      </Section>
      {!tracks.length && (
        <div className="empty-state">
          <Music2 size={32} />
          <h3>No music yet</h3>
          <p>
            Start the backend and run seed:demo, or add tracks from the admin
            dashboard.
          </p>
        </div>
      )}
      <Section
        title="Made for your mood"
        subtitle="Handpicked sounds to keep your day moving"
      >
        <div className="card-grid">
          {playlists.map((p) => (
            <PlaylistCard
              key={p._id}
              item={p}
              onPlay={playList}
              onOpen={() => navigate("/playlist/" + p._id)}
            />
          ))}
        </div>
      </Section>
      <Section
        title="Popular right now"
        subtitle="Tracks listeners are coming back to"
      >
        <div className="card-grid">
          {tracks.slice(0, 4).map((t) => (
            <TrackCard
              key={t._id}
              track={t}
              playTrack={playTrack}
              toggleLike={toggleLike}
              liked={liked}
            />
          ))}
        </div>
      </Section>
      <Section title="Fresh finds" subtitle="Explore something new">
        <div className="card-grid">
          {tracks.slice(4, 8).map((t) => (
            <TrackCard
              key={t._id}
              track={t}
              playTrack={playTrack}
              toggleLike={toggleLike}
              liked={liked}
            />
          ))}
        </div>
      </Section>
      <div className="wide-promo">
        <div className="promo-icon">
          <Headphones size={30} />
        </div>
        <div>
          <h3>Make it your soundtrack.</h3>
          <p>
            Save favorites, build playlists, and take your music everywhere.
          </p>
        </div>
        <button onClick={user ? () => navigate("/library") : openAuth}>
          {user ? "Open library" : "Get started"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
function SearchPage({
  query,
  setQuery,
  results,
  genres: genreNames = [],
  playTrack,
  liked,
  toggleLike,
}) {
  const palette = [
    "#e13300",
    "#7358ff",
    "#ba5d07",
    "#006450",
    "#e91429",
    "#477d95",
    "#8d67ab",
    "#27856a",
  ];
  const genres = genreNames.map((g, i) => [g, palette[i % palette.length]]);
  return (
    <div className="content-page">
      <div className="page-title">
        <h1>Search</h1>
        <p>Find the sound that feels like you.</p>
      </div>
      <div className="large-search">
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
        />
      </div>
      {query ? (
        <Section title={`Results for “${query}”`}>
          <div className="track-table">
            {results.map((t, i) => (
              <TrackRow
                key={t._id}
                track={t}
                index={i}
                playTrack={playTrack}
                liked={liked}
                toggleLike={toggleLike}
              />
            ))}
          </div>
          {!results.length && (
            <div className="empty-state">
              <Search size={32} />
              <h3>No results found</h3>
              <p>Try a different song, artist, or album.</p>
            </div>
          )}
        </Section>
      ) : (
        <Section title="Browse all">
          <div className="genre-grid">
            {genres.map(([g, c]) => (
              <button
                key={g}
                style={{ "--genre": c }}
                onClick={() => setQuery(g)}
              >
                {g}
                <Music2 size={35} />
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
function TrackRow({ track, index, playTrack, liked, toggleLike }) {
  return (
    <div className="track-row" onDoubleClick={() => playTrack(track)}>
      <button className="row-index" onClick={() => playTrack(track)}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <Play size={16} fill="currentColor" />
      </button>
      <img src={track.cover} alt="" />
      <div className="row-main">
        <b>{track.title}</b>
        <span>{track.artist}</span>
      </div>
      <span className="row-album">{track.album}</span>
      <button
        className={`row-heart ${liked.includes(track._id) ? "is-liked" : ""}`}
        onClick={() => toggleLike(track._id)}
      >
        <Heart
          size={17}
          fill={liked.includes(track._id) ? "currentColor" : "none"}
        />
      </button>
      <span className="row-duration">
        <Clock3 size={15} />
        {fmt(track.duration)}
      </span>
    </div>
  );
}
function LibraryPage({
  playlists,
  tracks,
  liked,
  playTrack,
  playList,
  user,
  openAuth,
}) {
  const navigate = useNavigate();
  return (
    <div className="content-page">
      <div className="page-title">
        <span className="eyebrow">YOUR COLLECTION</span>
        <h1>Your Library</h1>
        <p>Your saved music, all in one place.</p>
      </div>
      {!user && (
        <div className="notice-card">
          <div>
            <h3>Your music, your way.</h3>
            <p>Log in to sync your library and playlists.</p>
          </div>
          <button className="green-button" onClick={openAuth}>
            Log in
          </button>
        </div>
      )}
      <div className="library-grid">
        <button
          className="library-item liked-library"
          onClick={() => {
            const l = tracks.filter((t) => liked.includes(t._id));
            l.length ? playTrack(l[0], l) : alert("Like a song first.");
          }}
        >
          <div className="liked-gradient">
            <Heart fill="white" size={32} />
          </div>
          <div>
            <b>Liked Songs</b>
            <span>{liked.length} liked songs</span>
          </div>
          <span className="library-play">
            <Play fill="currentColor" />
          </span>
        </button>
        {playlists.map((p) => (
          <button
            className="library-item"
            key={p._id}
            onClick={() => navigate("/playlist/" + p._id)}
          >
            <img src={p.cover} alt="" />
            <div>
              <b>{p.name}</b>
              <span>Playlist · Soundwave</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
function LikedPage({ tracks, playTrack, toggleLike }) {
  return (
    <div className="content-page">
      <div className="liked-hero">
        <div className="liked-big">
          <Heart fill="white" size={42} />
        </div>
        <div>
          <span className="eyebrow">PLAYLIST</span>
          <h1>Liked Songs</h1>
          <p>{tracks.length} songs you love</p>
        </div>
      </div>
      <button
        className="big-play"
        onClick={() => tracks[0] && playTrack(tracks[0], tracks)}
      >
        <Play fill="currentColor" />
      </button>
      <div className="track-table">
        {tracks.map((t, i) => (
          <TrackRow
            key={t._id}
            track={t}
            index={i}
            playTrack={(x) => playTrack(x, tracks)}
            liked={tracks.map((x) => x._id)}
            toggleLike={toggleLike}
          />
        ))}
      </div>
      {!tracks.length && (
        <div className="empty-state">
          <Heart size={32} />
          <h3>Your favorites start here</h3>
          <p>Tap the heart on any track to save it.</p>
        </div>
      )}
    </div>
  );
}
function PlaylistPage({
  playlists,
  setPlaylists,
  tracks,
  user,
  notify,
  playTrack,
  liked,
  toggleLike,
}) {
  const { id } = useParams(),
    navigate = useNavigate(),
    [adding, setAdding] = useState(false);
  const p = playlists.find((x) => x._id === id);
  if (!p)
    return (
      <div className="content-page">
        <div className="empty-state">
          <Music2 size={32} />
          <h3>
            {playlists.length ? "Playlist not found" : "Loading playlist…"}
          </h3>
          <p>It may have been removed.</p>
        </div>
      </div>
    );
  const items = (p.trackIds || [])
    .map((x) => (typeof x === "string" ? tracks.find((t) => t._id === x) : x))
    .filter(Boolean);
  const canEdit =
    user && (user.role === "admin" || String(p.owner) === String(user.id));
  const save = async (ids) => {
    try {
      const r = await fetch(
        `${API}/playlists/${user.role === "admin" ? "admin/" : ""}${p._id}`,
        {
          method: "PATCH",
          headers: authHeaders(user),
          body: JSON.stringify({ trackIds: ids }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not update playlist");
      setPlaylists((v) => v.map((x) => (x._id === p._id ? d : x)));
    } catch (e) {
      notify(e.message);
    }
  };
  const ids = items.map((t) => t._id);
  const remove = async () => {
    if (!window.confirm(`Delete playlist ${p.name}?`)) return;
    try {
      const r = await fetch(
        `${API}/playlists/${user.role === "admin" ? "admin/" : ""}${p._id}`,
        { method: "DELETE", headers: authHeaders(user) },
      );
      if (!r.ok) throw Error("Could not delete playlist");
      setPlaylists((v) => v.filter((x) => x._id !== p._id));
      navigate("/library");
      notify("Playlist deleted.");
    } catch (e) {
      notify(e.message);
    }
  };
  return (
    <div className="content-page">
      <div className="playlist-hero">
        {p.cover ? (
          <img src={p.cover} alt="" />
        ) : (
          <div className="liked-big">
            <Music2 size={42} />
          </div>
        )}
        <div>
          <span className="eyebrow">
            {p.isPublic ? "PUBLIC PLAYLIST" : "YOUR PLAYLIST"}
          </span>
          <h1>{p.name}</h1>
          <p>{p.description}</p>
          <span className="playlist-owner">
            ♫ Soundwave · {items.length} songs
          </span>
        </div>
      </div>
      <button
        className="big-play"
        onClick={() => items[0] && playTrack(items[0], items)}
      >
        <Play fill="currentColor" />
      </button>
      {canEdit && (
        <div className="filter-pills">
          <button onClick={() => setAdding((v) => !v)}>
            {adding ? "Done" : "Add / remove songs"}
          </button>
          <button onClick={remove}>Delete playlist</button>
        </div>
      )}
      {adding && (
        <div className="admin-panel">
          {tracks.map((t) => (
            <label
              key={t._id}
              className="setting-row"
              style={{ cursor: "pointer" }}
            >
              <div>
                <b>{t.title}</b>
                <span>{t.artist}</span>
              </div>
              <input
                type="checkbox"
                checked={ids.includes(t._id)}
                onChange={(e) =>
                  save(
                    e.target.checked
                      ? [...ids, t._id]
                      : ids.filter((x) => x !== t._id),
                  )
                }
              />
            </label>
          ))}
        </div>
      )}
      <div className="track-table">
        {items.map((t, i) => (
          <TrackRow
            key={t._id}
            track={t}
            index={i}
            playTrack={(x) => playTrack(x, items)}
            liked={liked}
            toggleLike={toggleLike}
          />
        ))}
      </div>
      {!items.length && (
        <div className="empty-state">
          <Music2 size={32} />
          <h3>This playlist is empty</h3>
          <p>
            {canEdit
              ? "Use “Add / remove songs” to fill it."
              : "No tracks have been added yet."}
          </p>
        </div>
      )}
    </div>
  );
}
function PremiumPage({ user, activatePremium, openAuth }) {
  const active = user?.subscription === "premium";
  return (
    <div className="premium-page">
      <div className="premium-hero">
        <span className="eyebrow">SOUNDWAVE PREMIUM</span>
        <div className="premium-spark">✦</div>
        <h1>
          Music without
          <br />
          <em>limits.</em>
        </h1>
        <p>Unlock your listening experience with Soundwave Premium.</p>
        <div className="premium-price">
          <strong>Free</strong>
          <span>· Lifetime access for this portfolio demo</span>
        </div>
        <button
          className="green-button premium-cta"
          onClick={user ? activatePremium : openAuth}
        >
          {active ? (
            <>
              <Check size={18} /> Premium is active
            </>
          ) : (
            <>
              Get Premium free <ChevronRight size={18} />
            </>
          )}
        </button>
        <small>No payment details. No card. No checkout.</small>
      </div>
      <div className="premium-benefits">
        <div className="premium-benefit">
          <span>♫</span>
          <h3>Ad-free listening</h3>
          <p>Enjoy your music without interruptions in this demo experience.</p>
        </div>
        <div className="premium-benefit">
          <span>⇩</span>
          <h3>Offline-ready design</h3>
          <p>
            A premium-inspired experience with room to extend offline features.
          </p>
        </div>
        <div className="premium-benefit">
          <span>∞</span>
          <h3>Unlimited skips</h3>
          <p>Move between tracks and discover your next favorite sound.</p>
        </div>
        <div className="premium-benefit">
          <span>✦</span>
          <h3>Lifetime status</h3>
          <p>
            {active
              ? "Your Premium status is active and saved to your account."
              : "Activate once; your status is saved to your Soundwave account."}
          </p>
        </div>
      </div>
      <p className="premium-disclaimer">
        Portfolio project demo — this is Soundwave’s own free Premium feature,
        not an official Spotify subscription.
      </p>
    </div>
  );
}
function AccessPage({ openAuth }) {
  return (
    <div className="access-page">
      <div className="access-icon">
        <LockKeyhole size={30} />
      </div>
      <h1>Admin access only</h1>
      <p>Log in with an administrator account to manage Soundwave.</p>
      <button className="green-button" onClick={openAuth}>
        Log in
      </button>
    </div>
  );
}
function AdminPage({
  tracks,
  setTracks,
  playlists,
  setPlaylists,
  notify,
  user,
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview"),
    [members, setMembers] = useState([]),
    [membersLoaded, setMembersLoaded] = useState(false),
    [form, setForm] = useState({
      title: "",
      artist: "",
      album: "",
      genre: "Pop",
      cover: "",
      audioUrl: "",
    });
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState("");
  const [playlistForm, setPlaylistForm] = useState({
    name: "",
    description: "",
    cover: "",
  });
  useEffect(() => {
    if (tab === "Users" && !membersLoaded) {
      fetch(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setMembers)
        .catch(() =>
          notify("Could not load users. Check backend/admin access."),
        )
        .finally(() => setMembersLoaded(true));
    }
  }, [tab, membersLoaded, user?.token]);
  const deleteMember = async (member) => {
    if (member.role === "admin") {
      notify("Admin accounts cannot be deleted from this panel.");
      return;
    }
    if (!window.confirm(`Permanently delete ${member.name} (${member.email})?`))
      return;
    try {
      const r = await fetch(`${API}/auth/users/${member._id || member.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not delete user");
      setMembers((v) =>
        v.filter((m) => (m._id || m.id) !== (member._id || member.id)),
      );
      notify("User deleted from MongoDB.");
    } catch (e) {
      notify(e.message);
    }
  };
  const toggleSuspension = async (member) => {
    try {
      const r = await fetch(
        `${API}/auth/users/${member._id || member.id}/suspension`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ isSuspended: !member.isSuspended }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not update user");
      setMembers((v) =>
        v.map((m) =>
          (m._id || m.id) === (member._id || member.id)
            ? { ...m, ...d.user }
            : m,
        ),
      );
      notify(d.user.isSuspended ? "User suspended." : "User reactivated.");
    } catch (e) {
      notify(e.message);
    }
  };
  const toggleMemberPremium = async (member) => {
    try {
      const subscription =
        member.subscription === "premium" ? "free" : "premium";
      const r = await fetch(
        `${API}/auth/users/${member._id || member.id}/premium`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ subscription }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Update failed");
      setMembers((v) =>
        v.map((m) =>
          (m._id || m.id) === (member._id || member.id)
            ? { ...m, ...d.user }
            : m,
        ),
      );
      notify(`Updated ${member.name} to ${subscription}.`);
    } catch (e) {
      notify(e.message);
    }
  };
  const deleteTrack = async (track) => {
    if (!window.confirm(`Delete ${track.title}?`)) return;
    try {
      const r = await fetch(`${API}/tracks/${track._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not delete track");
      setTracks((v) => v.filter((t) => t._id !== track._id));
      notify("Track deleted from MongoDB.");
    } catch (e) {
      notify(e.message);
    }
  };
  const addPlaylist = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/playlists/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(playlistForm),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not add playlist");
      setPlaylists((v) => [d, ...v]);
      setPlaylistForm({ name: "", description: "", cover: "" });
      notify("Playlist added to MongoDB.");
    } catch (e) {
      notify(e.message);
    }
  };
  const deletePlaylist = async (p) => {
    if (!window.confirm(`Delete playlist ${p.name}?`)) return;
    try {
      const r = await fetch(`${API}/playlists/admin/${p._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not delete playlist");
      setPlaylists((v) => v.filter((x) => x._id !== p._id));
      notify("Playlist deleted from MongoDB.");
    } catch (e) {
      notify(e.message);
    }
  };
  const detectDuration = (url) =>
    new Promise((res) => {
      const a = new Audio();
      const done = (v) => {
        a.src = "";
        res(v);
      };
      a.preload = "metadata";
      a.onloadedmetadata = () =>
        done(Number.isFinite(a.duration) ? Math.round(a.duration) : 180);
      a.onerror = () => done(180);
      setTimeout(() => done(180), 6000);
      a.src = url;
    });
  const stats = [
    ["Total tracks", tracks.length, Music2],
    ["Artists", new Set(tracks.map((t) => t.artist)).size, Users],
    [
      "Total plays",
      tracks.reduce((a, t) => a + (t.plays || 0), 0).toLocaleString(),
      Headphones,
    ],
    ["Albums", new Set(tracks.map((t) => t.album)).size, Disc3],
  ];
  const uploadFile = async (kind, file) => {
    if (!file) return;
    setUploading(kind);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch(`${API}/upload/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user?.token}` },
        body,
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Upload failed");
      setForm((v) => ({
        ...v,
        [kind === "audio" ? "audioUrl" : "cover"]: d.url,
      }));
      notify(
        kind === "audio"
          ? "MP3 uploaded. Now fill the title and save."
          : "Cover uploaded.",
      );
    } catch (e) {
      notify(
        e.message === "Failed to fetch" ? "Backend unavailable." : e.message,
      );
    } finally {
      setUploading("");
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const token = user?.token;
      const r = await fetch(`${API}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          duration: await detectDuration(form.audioUrl),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || "Could not add track");
      setTracks((v) => [d, ...v]);
      setForm({
        title: "",
        artist: "",
        album: "",
        genre: "Pop",
        cover: "",
        audioUrl: "",
      });
      notify("Track added to database.");
    } catch (err) {
      if (err.message === "Failed to fetch")
        notify("Backend unavailable. Start server and sign in as admin.");
      else notify(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <span className="eyebrow">SOUNDWAVE CONTROL CENTER</span>
          <h1>Admin dashboard</h1>
          <p>Manage your music platform from one place.</p>
        </div>
        <div className="admin-user">
          <span className="avatar">{(user?.name || "A")[0]}</span>
          <div>
            <b>{user?.name || "Administrator"}</b>
            <small>Administrator</small>
          </div>
        </div>
      </div>
      <div className="admin-tabs">
        {[
          "Overview",
          "Tracks",
          "Add track",
          "Playlists",
          "Analytics",
          "Users",
          "Settings",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <div className="stats-grid">
            {stats.map(([label, value, Icon]) => (
              <div className="stat-card" key={label}>
                <div className="stat-icon">
                  <Icon size={19} />
                </div>
                <span>{label}</span>
                <b>{value}</b>
                <small>
                  <TrendingUp size={13} /> Current catalog
                </small>
              </div>
            ))}
          </div>
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h3>Top tracks</h3>
                <p>Your most-played catalog items</p>
              </div>
              <button className="outline-btn" onClick={() => setTab("Tracks")}>
                Manage tracks
              </button>
            </div>
            {[...tracks]
              .sort((a, b) => (b.plays || 0) - (a.plays || 0))
              .slice(0, 5)
              .map((t, i) => (
                <TrackRow
                  key={t._id}
                  track={t}
                  index={i}
                  playTrack={() =>
                    notify("Use the main site to play this track.")
                  }
                  liked={[]}
                  toggleLike={() => {}}
                />
              ))}
          </div>
        </>
      )}
      {tab === "Tracks" && (
        <div className="admin-panel">
          <div className="panel-heading">
            <div>
              <h3>Music catalog</h3>
              <p>{tracks.length} tracks available</p>
            </div>
            <button
              className="green-button"
              onClick={() => setTab("Add track")}
            >
              <Plus size={16} /> Add track
            </button>
          </div>
          {tracks.map((t, i) => (
            <div className="admin-track" key={t._id}>
              <img src={t.cover} alt="" />
              <div>
                <b>{t.title}</b>
                <span>
                  {t.artist} · {t.album}
                </span>
              </div>
              <span>{t.genre}</span>
              <span>{(t.plays || 0).toLocaleString()} plays</span>
              <button
                className="outline-btn danger-btn"
                onClick={() => deleteTrack(t)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === "Add track" && (
        <form className="admin-panel add-track-form" onSubmit={submit}>
          <div className="panel-heading">
            <div>
              <h3>Add a track</h3>
              <p>Upload an MP3, or paste an authorized audio URL.</p>
            </div>
            <Upload />
          </div>
          <div className="form-grid">
            {[
              ["title", "Track title"],
              ["artist", "Artist name"],
              ["album", "Album name"],
              ["genre", "Genre"],
              ["cover", "Cover image URL"],
              ["audioUrl", "Audio file URL"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={["title", "artist", "audioUrl"].includes(key)}
                  name={key}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, [key]: e.target.value }))
                  }
                  placeholder={label}
                />
              </label>
            ))}
          </div>
          <div className="form-grid">
            <label>
              Upload MP3 (max 40 MB)
              <input
                type="file"
                accept="audio/*"
                disabled={Boolean(uploading)}
                onChange={(e) => uploadFile("audio", e.target.files[0])}
              />
            </label>
            <label>
              Upload cover image (max 8 MB)
              <input
                type="file"
                accept="image/*"
                disabled={Boolean(uploading)}
                onChange={(e) => uploadFile("cover", e.target.files[0])}
              />
            </label>
          </div>
          {uploading && (
            <p className="tiny muted">Uploading {uploading}… please wait.</p>
          )}
          <button
            disabled={busy || Boolean(uploading)}
            className="green-button"
          >
            {busy ? "Saving…" : "Save track"}
          </button>
          <p className="tiny muted">
            Files go to Cloudinary; MongoDB stores only the link. Upload only
            audio you have the rights to use.
          </p>
        </form>
      )}
      {tab === "Playlists" && (
        <>
          <form className="admin-panel add-track-form" onSubmit={addPlaylist}>
            <div className="panel-heading">
              <div>
                <h3>Add playlist</h3>
                <p>Playlists are stored in MongoDB and appear in the app.</p>
              </div>
              <Plus />
            </div>
            <div className="form-grid">
              <label>
                Playlist name
                <input
                  required
                  value={playlistForm.name}
                  onChange={(e) =>
                    setPlaylistForm((v) => ({ ...v, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Description
                <input
                  value={playlistForm.description}
                  onChange={(e) =>
                    setPlaylistForm((v) => ({
                      ...v,
                      description: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Cover image URL
                <input
                  value={playlistForm.cover}
                  onChange={(e) =>
                    setPlaylistForm((v) => ({ ...v, cover: e.target.value }))
                  }
                />
              </label>
            </div>
            <button className="green-button">Add playlist</button>
          </form>
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h3>Playlists</h3>
                <p>{playlists.length} playlists in database</p>
              </div>
            </div>
            {playlists.map((p) => (
              <div className="admin-track" key={p._id}>
                <img src={p.cover} alt="" />
                <div>
                  <b>{p.name}</b>
                  <span>{p.description || "No description"}</span>
                </div>
                <span>{(p.trackIds || []).length} tracks</span>
                <button
                  className="outline-btn"
                  onClick={() => navigate("/playlist/" + p._id)}
                >
                  Edit tracks
                </button>
                <button
                  className="outline-btn danger-btn"
                  onClick={() => deletePlaylist(p)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "Analytics" && (
        <div className="admin-panel">
          <h3>Listening analytics</h3>
          <p className="muted">
            Current catalog snapshot. Live listener analytics become available
            when playback event tracking is connected.
          </p>
          <div className="stats-grid">
            {stats.map(([label, value, Icon]) => (
              <div className="stat-card" key={label}>
                <Icon />
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "Users" && (
        <div className="admin-panel">
          <div className="panel-heading">
            <div>
              <h3>User subscriptions</h3>
              <p>Manage lifetime Premium status for registered accounts.</p>
            </div>
            <Users size={20} />
          </div>
          {members.length === 0 ? (
            <p className="muted">
              {membersLoaded ? "No registered users found." : "Loading users…"}
            </p>
          ) : (
            members.map((m) => (
              <div className="setting-row" key={m._id || m.id}>
                <div>
                  <b>
                    {m.name} {m.role === "admin" ? "· Admin" : ""}
                  </b>
                  <span>{m.email}</span>
                </div>
                <div className="member-subscription">
                  <span
                    className={`status-pill ${m.subscription === "premium" ? "" : "pending"}`}
                  >
                    {m.subscription === "premium" ? "Premium" : "Free"}
                  </span>
                  <button
                    className="outline-btn"
                    onClick={() => toggleMemberPremium(m)}
                  >
                    {m.subscription === "premium"
                      ? "Set Free"
                      : "Grant Premium"}
                  </button>
                  {m.role !== "admin" && (
                    <>
                      <button
                        className="outline-btn"
                        onClick={() => toggleSuspension(m)}
                      >
                        {m.isSuspended ? "Reactivate" : "Suspend"}
                      </button>
                      <button
                        className="outline-btn danger-btn"
                        onClick={() => deleteMember(m)}
                      >
                        Delete user
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {tab === "Settings" && (
        <div className="admin-panel">
          <h3>Platform settings</h3>
          <p className="muted">
            Configure MongoDB, JWT, storage, CORS and payment provider in the
            server environment before launch.
          </p>
          <div className="setting-row">
            <div>
              <b>Brand</b>
              <span>Soundwave</span>
            </div>
            <span className="status-pill">Active</span>
          </div>
          <div className="setting-row">
            <div>
              <b>Payment gateway</b>
              <span>Not configured in starter</span>
            </div>
            <span className="status-pill pending">Setup needed</span>
          </div>
        </div>
      )}
    </div>
  );
}
function Player({
  current,
  playing,
  setPlaying,
  progress,
  duration,
  audio,
  next,
  prev,
  volume,
  setVolume,
  shuffle,
  setShuffle,
  repeat,
  setRepeat,
  liked,
  toggleLike,
}) {
  return (
    <footer className="player">
      <div className="now-playing">
        <img src={current?.cover} alt="" />
        <div className="now-text">
          <b>{current?.title}</b>
          <span>{current?.artist}</span>
        </div>
        <button
          className={`player-heart ${liked.includes(current?._id) ? "is-liked" : ""}`}
          onClick={() => toggleLike(current?._id)}
        >
          <Heart
            size={17}
            fill={liked.includes(current?._id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="player-center">
        <div className="player-controls">
          <button
            className={shuffle ? "control-active" : "control-muted"}
            onClick={() => setShuffle(!shuffle)}
          >
            <Shuffle size={16} />
          </button>
          <button onClick={prev}>
            <SkipBack fill="currentColor" size={19} />
          </button>
          <button className="main-play" onClick={() => setPlaying(!playing)}>
            {playing ? (
              <Pause fill="currentColor" size={19} />
            ) : (
              <Play fill="currentColor" size={19} />
            )}
          </button>
          <button onClick={next}>
            <SkipForward fill="currentColor" size={19} />
          </button>
          <button
            className={repeat ? "control-active" : "control-muted"}
            onClick={() => setRepeat(!repeat)}
          >
            <Repeat size={16} />
          </button>
        </div>
        <div className="progress-line">
          <span>{fmt(progress)}</span>
          <input
            aria-label="Playback position"
            type="range"
            min="0"
            max={duration || 1}
            value={Math.min(progress, duration || 1)}
            onChange={(e) => {
              if (audio.current)
                audio.current.currentTime = Number(e.target.value);
            }}
          />
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <div className="player-right">
        <Music2 size={17} />
        <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          aria-label="Volume"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
        <button>
          <MoreHorizontal size={19} />
        </button>
      </div>
    </footer>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <b>soundwave</b>
        <p>Your music. Your moments.</p>
      </div>
      <div className="footer-links">
        <span>About</span>
        <span>Privacy</span>
        <span>Terms</span>
        <span>Support</span>
      </div>
      <span>© 2026 Soundwave</span>
    </footer>
  );
}
export default App;
