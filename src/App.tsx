import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HashRouter, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";

type Channel = "email" | "sms";
type Region = "CA" | "US";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  region: Region;
  notes: string;
  replied: boolean;
  createdAt: string;
  updatedAt: string;
  history: { id: string; date: string; text: string }[];
};

type FollowUp = {
  id: string;
  contactId: string;
  channel: Channel;
  date: string;
  time: string;
  status: "pending" | "done" | "cancelled";
  subject: string;
  draft: string;
  sequenceId?: string;
};

type LegacyFollowUp = Omit<FollowUp, "channel"> & { channel: Channel | "call" };

type MessageTemplate = {
  id: string;
  channel: "email" | "sms";
  name: string;
  subject: string;
  body: string;
};

type CRMData = {
  version: number;
  owner: {
    name: string;
    role: string;
    company: string;
    site: string;
    email: string;
    caPhone: string;
    usPhone: string;
  };
  contacts: Contact[];
  followUps: FollowUp[];
  templates: MessageTemplate[];
  notice: string;
};

type StoredCRMData = Omit<CRMData, "version" | "followUps"> & {
  version?: number;
  followUps: LegacyFollowUp[];
};

const TORONTO_TIME_ZONE = "America/Toronto";

const getTorontoParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
};

const todayISO = () => {
  const { year, month, day } = getTorontoParts();
  return `${year}-${month}-${day}`;
};

const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return value.toISOString().slice(0, 10);
};

const padTime = (time: string) => {
  const [hour = "0", minute = "00"] = time.split(":");
  return `${String(Number(hour) || 0).padStart(2, "0")}:${String(Number(minute) || 0).padStart(2, "0")}`;
};

const defaultDueTime = () => {
  const current = getTorontoParts();
  const future = getTorontoParts(new Date(Date.now() + 60 * 60 * 1000));
  if (
    `${future.year}-${future.month}-${future.day}` !==
    `${current.year}-${current.month}-${current.day}`
  )
    return "23:59";
  return padTime(`${future.hour}:${future.minute}`);
};

const isPastToronto = (date: string, time: string) => {
  const now = getTorontoParts();
  const currentKey = `${now.year}-${now.month}-${now.day}T${padTime(`${now.hour}:${now.minute}`)}`;
  return `${date}T${padTime(time)}` < currentKey;
};

const smsHref = (phone: string, body: string) => {
  const digits = phone.replace(/[^\d+]/g, "");
  const queryPrefix = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?";
  return `sms:${digits}${queryPrefix}body=${encodeURIComponent(body)}`;
};

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard can fail outside a secure context or without permission.
  }
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const websiteHref = (site: string) =>
  /^https?:\/\//i.test(site.trim()) ? site.trim() : `https://${site.trim()}`;
const isValidWebsite = (site: string) => {
  try {
    const url = new URL(websiteHref(site));
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
};

const initialData: CRMData = {
  version: 4,
  owner: {
    name: "Josh Schwartz",
    role: "Sales Rep",
    company: "Future Buildings Inc.",
    site: "https://futurebuildings.com/",
    email: "jschwartz@torosteel.com",
    caPhone: "+1-437-566-5598",
    usPhone: "",
  },
  contacts: [],
  followUps: [],
  templates: [
    {
      id: "email-introduction",
      channel: "email",
      name: "Project introduction",
      subject: "Building options for [Company]",
      body: "Hi [First name],\n\nThank you for your interest in Future Buildings. I’m reaching out to learn more about what [Company] needs and to help you review the right building options.\n\nWould you have 10 minutes for a quick call this week?\n\nJosh Schwartz\nFuture Buildings Inc.",
    },
    {
      id: "sms-follow-up",
      channel: "sms",
      name: "Quick follow-up",
      subject: "",
      body: "Hi [First name], it’s Josh from Future Buildings. I’m following up about your building project at [Company]. When would be a good time for a quick call?",
    },
  ],
  notice: "",
};

const DEMO_CONTACT_ID = "example-contact";

const isRegion = (value: unknown): value is Region => value === "CA" || value === "US";
const isChannel = (value: unknown): value is Channel => value === "email" || value === "sms";

function sanitizeCRM(raw: unknown): CRMData {
  if (!raw || typeof raw !== "object") return initialData;
  const parsed = raw as StoredCRMData;
  const owner = {
    ...initialData.owner,
    ...(parsed.owner && typeof parsed.owner === "object" ? parsed.owner : {}),
  };
  const contacts = (Array.isArray(parsed.contacts) ? parsed.contacts : [])
    .filter((contact) => contact && typeof contact === "object" && contact.id !== DEMO_CONTACT_ID)
    .map((contact) => ({
      id: String(contact.id || crypto.randomUUID()),
      firstName: String(contact.firstName ?? ""),
      lastName: String(contact.lastName ?? ""),
      company: String(contact.company ?? ""),
      phone: String(contact.phone ?? ""),
      email: String(contact.email ?? ""),
      region: isRegion(contact.region) ? contact.region : ("CA" as Region),
      notes: String(contact.notes ?? ""),
      replied: Boolean(contact.replied),
      createdAt: String(contact.createdAt ?? new Date().toISOString()),
      updatedAt: String(contact.updatedAt ?? new Date().toISOString()),
      history: (Array.isArray(contact.history) ? contact.history : []).map((entry) => ({
        id: String(entry?.id || crypto.randomUUID()),
        date: String(entry?.date || todayISO()),
        text: String(entry?.text ?? ""),
      })),
    }));
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const followUps = (Array.isArray(parsed.followUps) ? parsed.followUps : [])
    .filter(
      (item): item is FollowUp =>
        Boolean(item) &&
        typeof item === "object" &&
        item.contactId !== DEMO_CONTACT_ID &&
        isChannel(item.channel) &&
        contactIds.has(String(item.contactId)),
    )
    .map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      contactId: String(item.contactId),
      channel: item.channel,
      date: String(item.date || todayISO()),
      time: padTime(String(item.time || "09:30")),
      status:
        item.status === "done" || item.status === "cancelled" || item.status === "pending"
          ? item.status
          : ("pending" as const),
      subject: String(item.subject ?? ""),
      draft: String(item.draft ?? ""),
      sequenceId: item.sequenceId ? String(item.sequenceId) : undefined,
    }));
  const templates = (Array.isArray(parsed.templates) ? parsed.templates : initialData.templates)
    .filter((item) => item && typeof item === "object" && isChannel(item.channel))
    .map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      channel: item.channel,
      name: String(item.name ?? ""),
      subject: String(item.subject ?? ""),
      body: String(item.body ?? ""),
    }));
  return {
    version: 4,
    owner: {
      name: String(owner.name || initialData.owner.name),
      role: String(owner.role || initialData.owner.role),
      company: String(owner.company || initialData.owner.company),
      site: String(owner.site || initialData.owner.site),
      email: String(owner.email || initialData.owner.email),
      caPhone: String(owner.caPhone || initialData.owner.caPhone),
      usPhone: String(owner.usPhone ?? ""),
    },
    contacts,
    followUps,
    templates: templates.length ? templates : initialData.templates,
    notice: typeof parsed.notice === "string" ? parsed.notice : "",
  };
}

function useCRM() {
  const [data, setData] = useState<CRMData>(() => {
    try {
      const saved = localStorage.getItem("future-buildings-crm-v2");
      if (!saved) return initialData;
      return sanitizeCRM(JSON.parse(saved));
    } catch {
      return initialData;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("future-buildings-crm-v2", JSON.stringify(data));
    } catch {
      // Quota or private-mode write failures should not crash the UI.
    }
  }, [data]);

  return [data, setData] as const;
}

type IconName =
  | "home"
  | "contacts"
  | "calendar"
  | "template"
  | "user"
  | "search"
  | "plus"
  | "mail"
  | "phone"
  | "message"
  | "check"
  | "x"
  | "copy"
  | "arrow"
  | "chevronLeft"
  | "chevronRight"
  | "weatherSun"
  | "weatherCloud"
  | "weatherRain"
  | "weatherSnow"
  | "building"
  | "location"
  | "edit";

const iconPaths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  contacts: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  template: (
    <>
      <path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L9 10.8a16 16 0 0 0 4.2 4.2l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  ),
  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  weatherSun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </>
  ),
  weatherCloud: <path d="M17.5 19H7a5 5 0 1 1 1.3-9.83A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8Z" />,
  weatherRain: (
    <>
      <path d="M17.5 16H7a5 5 0 1 1 1.3-9.83A6 6 0 0 1 20 8a4 4 0 0 1-2.5 8Z" />
      <path d="m8 20-1 2M13 20l-1 2M18 20l-1 2" />
    </>
  ),
  weatherSnow: (
    <>
      <path d="M17.5 15H7a5 5 0 1 1 1.3-9.83A6 6 0 0 1 20 7a4 4 0 0 1-2.5 8Z" />
      <path d="M8 19h.01M13 21h.01M18 19h.01" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M8 21v-5h8v5M8 10h.01M12 10h.01M16 10h.01M8 13h.01M12 13h.01M16 13h.01M2 21h20" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function AppShell({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("crm-sidebar-collapsed") === "true",
  );
  useEffect(() => {
    localStorage.setItem("crm-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const nav = [
    ["/", "Today", "home"],
    ["/contacts", "Contacts", "contacts"],
    ["/schedule", "Schedule", "calendar"],
    ["/templates", "Templates", "template"],
  ] as const;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="Future Buildings CRM home">
          <span className="brand-mark">
            <Icon name="building" size={23} />
          </span>
          <span className="brand-copy">
            <strong>{data.owner.company}</strong>
            <small>{data.owner.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          {nav.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <Icon name={icon} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <Icon name={sidebarCollapsed ? "chevronRight" : "chevronLeft"} />
        </button>
        <NavLink
          to="/profile"
          title={sidebarCollapsed ? "Profile" : undefined}
          className={({ isActive }) => (isActive ? "sidebar-profile active" : "sidebar-profile")}
        >
          <span className="mini-avatar">
            {data.owner.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span>
            <strong>{data.owner.name}</strong>
            <small>{data.owner.role}</small>
          </span>
          <span className="mobile-user-icon">
            <Icon name="user" />
          </span>
          <span className="profile-mobile-label">Profile</span>
          <Icon name="chevronRight" />
        </NavLink>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Today data={data} setData={setData} />} />
          <Route path="/contacts" element={<Contacts data={data} setData={setData} />} />
          <Route path="/contacts/:id" element={<ContactDetail data={data} setData={setData} />} />
          <Route path="/schedule" element={<Schedule data={data} setData={setData} />} />
          <Route path="/templates" element={<Templates data={data} setData={setData} />} />
          <Route path="/profile" element={<Profile data={data} setData={setData} />} />
        </Routes>
      </main>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

function WeatherLine() {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30000);
    const controller = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832&current=temperature_2m,weather_code&timezone=America%2FToronto",
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw new Error("Weather request failed");
        return response.json();
      })
      .then((json) => {
        const temp = json?.current?.temperature_2m;
        const code = json?.current?.weather_code;
        if (typeof temp !== "number" || typeof code !== "number") throw new Error("Bad weather payload");
        setWeather({
          temp: Math.round(temp),
          code,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeather(null);
      });
    return () => {
      controller.abort();
      window.clearInterval(tick);
    };
  }, []);

  const date = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TORONTO_TIME_ZONE,
  }).format(now);
  const time = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TORONTO_TIME_ZONE,
  })
    .format(now)
    .replace(/a\.m\./i, "AM")
    .replace(/p\.m\./i, "PM");
  const weatherIcon: IconName = !weather
    ? "weatherCloud"
    : weather.code <= 1
      ? "weatherSun"
      : weather.code <= 3
        ? "weatherCloud"
        : weather.code <= 67
          ? "weatherRain"
          : "weatherSnow";
  const weatherLabel = !weather
    ? "Weather unavailable"
    : weather.code <= 1
      ? "Clear"
      : weather.code <= 3
        ? "Cloudy"
        : weather.code <= 67
          ? "Rain"
          : "Snow";

  return (
    <div className="today-hero">
      <div className="today-date">{date}</div>
      <span className="today-separator">·</span>
      <div className="today-time">{time}</div>
      <div className="today-meta">
        <span className="today-location">
          <Icon name="location" size={20} />
          Toronto
        </span>
        <span className="today-separator">·</span>
        <span className="weather">
          <Icon name={weatherIcon} size={22} />
          {weather ? `${weather.temp}°C` : weatherLabel}
        </span>
      </div>
    </div>
  );
}

function Today({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const navigate = useNavigate();
  const due = data.followUps
    .filter((item) => item.status === "pending" && item.date <= todayISO())
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const pending = data.followUps
    .filter((item) => item.status === "pending")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const upcoming = pending.filter((item) => item.date > todayISO());
  const visibleFollowUps = due.length ? due : upcoming.slice(0, 1);
  const isOverdue = (item: FollowUp) => isPastToronto(item.date, item.time);
  const overdueCount = due.filter(isOverdue).length;

  const updateStatus = (id: string, status: FollowUp["status"]) => {
    setData((current) => {
      const target = current.followUps.find((item) => item.id === id);
      return {
        ...current,
        followUps: current.followUps.map((item) => (item.id === id ? { ...item, status } : item)),
        contacts: target
          ? current.contacts.map((contact) =>
              contact.id === target.contactId
                ? {
                    ...contact,
                    updatedAt: new Date().toISOString(),
                    history: [
                      {
                        id: crypto.randomUUID(),
                        date: todayISO(),
                        text: `${channelName(target.channel)} follow-up ${status === "done" ? "completed" : "cancelled"}.`,
                      },
                      ...contact.history,
                    ],
                  }
                : contact,
            )
          : current.contacts,
      };
    });
  };

  return (
    <div className="page today-page">
      <WeatherLine />
      {data.notice && (
        <div className="reply-banner notice-banner">
          <Icon name="check" />
          <span>{data.notice}</span>
          <button
            className="text-button"
            onClick={() => setData((current) => ({ ...current, notice: "" }))}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="quick-grid">
        <button className="quick-link contacts-link" onClick={() => navigate("/contacts")}>
          <span className="quick-icon">
            <Icon name="contacts" size={22} />
          </span>
          <span>
            <strong>
              {data.contacts.length} Contact{data.contacts.length === 1 ? "" : "s"}
            </strong>
            <small>Search and follow up</small>
          </span>
          <Icon name="arrow" size={20} />
        </button>
        <button className="quick-link schedule-link" onClick={() => navigate("/schedule")}>
          <span className="quick-icon">
            <Icon name="calendar" size={22} />
          </span>
          <span>
            <strong>Schedule</strong>
            <small>
              {pending.length} follow-up{pending.length === 1 ? "" : "s"} scheduled
            </small>
          </span>
          <Icon name="arrow" size={20} />
        </button>
      </div>
      <section className="section today-work">
        <div className="section-heading">
          <div>
            <h2>{due.length ? "Today’s to-dos" : "Next follow-up"}</h2>
          </div>
          <span
            className={`count-pill due-count ${overdueCount ? "overdue" : due.length ? "today" : upcoming.length ? "upcoming" : ""}`}
          >
            {overdueCount
              ? `${overdueCount} overdue`
              : due.length
                ? `${due.length} due today`
                : upcoming.length
                  ? `Due ${formatShortDate(upcoming[0].date)}`
                  : "Nothing due"}
          </span>
        </div>
        {visibleFollowUps.length === 0 ? (
          <div className="empty-state">
            <Icon name="check" size={25} />
            <strong>You’re caught up.</strong>
            <span>No follow-ups are scheduled.</span>
          </div>
        ) : (
          <div className="due-list">
            {visibleFollowUps.map((item) => {
              const contact = data.contacts.find((entry) => entry.id === item.contactId);
              if (!contact) return null;
              const canOpen =
                item.channel === "email" ? Boolean(contact.email) : Boolean(contact.phone);
              return (
                <article
                  className={`due-card ${item.channel} ${isOverdue(item) ? "is-overdue" : ""}`}
                  key={item.id}
                >
                  <div className="due-card-top">
                    <span className={`channel-icon ${item.channel}`}>
                      <Icon name={item.channel === "email" ? "mail" : "message"} />
                    </span>
                    <div>
                      <span className="channel-label">{item.channel}</span>
                      <h3>
                        {contact.region === "CA" ? "🇨🇦" : "🇺🇸"} {contact.firstName}{" "}
                        {contact.lastName}
                        {contact.company && <span> · {contact.company}</span>}
                      </h3>
                      <small className="due-time">
                        <span>
                          {isOverdue(item)
                            ? "Overdue"
                            : item.date === todayISO()
                              ? "Due today"
                              : `Due ${formatShortDate(item.date)}`}
                        </span>
                        {formatTime(item.time)}
                      </small>
                    </div>
                  </div>
                  <p className="draft-text">{item.draft}</p>
                  <div className="card-actions">
                    <button
                      className="button primary"
                      disabled={!canOpen}
                      onClick={() => openDraft(item, contact)}
                    >
                      <Icon name="arrow" />
                      Open
                    </button>
                    <button className="button" onClick={() => void copyText(item.draft)}>
                      <Icon name="copy" />
                      Copy
                    </button>
                    <button className="button" onClick={() => updateStatus(item.id, "done")}>
                      <Icon name="check" />
                      Done
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => updateStatus(item.id, "cancelled")}
                    >
                      <Icon name="x" />
                      Cancel
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function openDraft(item: FollowUp, contact: Contact) {
  if (item.channel === "email") {
    if (!contact.email.trim()) return;
    window.location.href = `mailto:${contact.email.trim()}?subject=${encodeURIComponent(item.subject || "Future Buildings follow-up")}&body=${encodeURIComponent(item.draft)}`;
  } else {
    if (!contact.phone.trim()) return;
    window.location.href = smsHref(contact.phone, item.draft);
  }
}

function Contacts({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();
  const pageSize = 10;
  const filtered = data.contacts.filter((contact) =>
    `${contact.firstName} ${contact.lastName} ${contact.company} ${contact.email} ${contact.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => setPage(1), [query]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Relationship pipeline"
        title="Contacts"
        actions={
          <button className="button primary" onClick={() => setShowNew(true)}>
            <Icon name="plus" />
            New contact
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="Search contacts"
            placeholder="Search name, company, phone, or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span>
          {filtered.length} contact{filtered.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Region</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((contact) => (
              <tr
                key={contact.id}
                tabIndex={0}
                aria-label={`Open ${contact.firstName} ${contact.lastName}`}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/contacts/${contact.id}`);
                  }
                }}
              >
                <td>
                  <strong>
                    {contact.firstName} {contact.lastName}
                  </strong>
                </td>
                <td>{contact.company || <span className="muted">Not provided</span>}</td>
                <td>{contact.phone}</td>
                <td>{contact.email}</td>
                <td>
                  <span
                    className="region-pill"
                    aria-label={contact.region === "CA" ? "Canada" : "United States"}
                  >
                    {contact.region === "CA" ? "🇨🇦" : "🇺🇸"}
                  </span>
                </td>
                <td>
                  <Icon name="chevronRight" />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="no-results">
                  {data.contacts.length === 0
                    ? "No contacts yet. Add your first contact to get started."
                    : query.trim()
                      ? "No contacts match your search."
                      : "No contacts to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}-
          {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div>
          <button
            className="icon-button"
            disabled={safePage === 1}
            onClick={() => setPage((value) => value - 1)}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" />
          </button>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <button
            className="icon-button"
            disabled={safePage === totalPages}
            onClick={() => setPage((value) => value + 1)}
            aria-label="Next page"
          >
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>
      {showNew && <ContactModal setData={setData} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function ContactDetail({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const contact = data.contacts.find((item) => item.id === id);
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [scheduleChannel, setScheduleChannel] = useState<Channel | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<FollowUp | null>(null);
  useEffect(() => setNotes(contact?.notes ?? ""), [contact?.notes]);
  if (!contact)
    return (
      <div className="page">
        <button className="text-button" onClick={() => navigate("/contacts")}>
          Back to contacts
        </button>
        <h1>Contact not found</h1>
      </div>
    );

  const schedules = data.followUps.filter((item) => item.contactId === contact.id);
  const saveNotes = () =>
    setData((current) => ({
      ...current,
      contacts: current.contacts.map((item) =>
        item.id === contact.id ? { ...item, notes, updatedAt: new Date().toISOString() } : item,
      ),
    }));
  const finishNotes = () => {
    saveNotes();
    setEditingNotes(false);
  };
  const markReply = () => {
    const stopped = data.followUps.filter(
      (item) => item.contactId === contact.id && item.status === "pending",
    ).length;
    setData((current) => ({
      ...current,
      notice: `${contact.firstName} ${contact.lastName} replied.${stopped ? ` ${stopped} remaining follow-up${stopped === 1 ? "" : "s"} stopped.` : ""}`,
      contacts: current.contacts.map((item) =>
        item.id === contact.id
          ? {
              ...item,
              replied: true,
              updatedAt: new Date().toISOString(),
              history: [
                {
                  id: crypto.randomUUID(),
                  date: todayISO(),
                  text: "Reply received. Active sequence stopped.",
                },
                ...item.history,
              ],
            }
          : item,
      ),
      followUps: current.followUps.map((item) =>
        item.contactId === contact.id && item.status === "pending"
          ? { ...item, status: "cancelled" }
          : item,
      ),
    }));
  };
  const cancelSequence = () =>
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) =>
        item.contactId === contact.id && item.status === "pending"
          ? { ...item, status: "cancelled" }
          : item,
      ),
      contacts: current.contacts.map((item) =>
        item.id === contact.id
          ? {
              ...item,
              history: [
                {
                  id: crypto.randomUUID(),
                  date: todayISO(),
                  text: "Remaining sequence cancelled.",
                },
                ...item.history,
              ],
            }
          : item,
      ),
    }));

  return (
    <div className="page contact-page">
      <header className="contact-header">
        <div>
          <button className="back-button" onClick={() => navigate("/contacts")}>
            <Icon name="chevronLeft" />
            All contacts
          </button>
          <h1>
            {contact.firstName} {contact.lastName}
          </h1>
          <p>
            {contact.region === "CA" ? "🇨🇦" : "🇺🇸"}
            {contact.company && ` ${contact.company}`}
          </p>
        </div>
        <div className="contact-actions">
          <button className="button" title="Edit contact details" onClick={() => setShowEdit(true)}>
            <Icon name="edit" />
            Edit
          </button>
          <button
            className="button"
            title="Mark this contact as replied and stop pending follow-ups"
            onClick={markReply}
            disabled={contact.replied}
          >
            <Icon name="check" />
            {contact.replied ? "Replied" : "Mark as replied"}
          </button>
          <button
            className="button primary"
            title="Schedule an email follow-up"
            disabled={!contact.email}
            onClick={() => setScheduleChannel("email")}
          >
            <Icon name="mail" />
            Schedule email
          </button>
          <button
            className="button primary"
            title="Schedule an SMS follow-up"
            disabled={!contact.phone}
            onClick={() => setScheduleChannel("sms")}
          >
            <Icon name="message" />
            Schedule SMS
          </button>
        </div>
      </header>
      <div className="contact-info-line">
        <a href={`mailto:${contact.email}`}>
          <Icon name="mail" />
          {contact.email}
        </a>
        <a href={`tel:${contact.phone}`}>
          <Icon name="phone" />
          {contact.phone}
        </a>
      </div>
      {contact.replied && (
        <div className="reply-banner">
          <Icon name="check" /> Reply received. Pending sequence steps were stopped.
        </div>
      )}
      <div className="detail-grid">
        <section className="detail-section">
          <div className="section-heading">
            <div>
              <h2>Notes</h2>
              <p>Project details and conversation notes.</p>
            </div>
            {!editingNotes && (
              <button className="button" onClick={() => setEditingNotes(true)}>
                Edit notes
              </button>
            )}
          </div>
          {editingNotes ? (
            <>
              <textarea
                className="notes-area"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add project requirements, timing, and next steps"
              />
              <div className="notes-actions">
                <button
                  className="button"
                  onClick={() => {
                    setNotes(contact.notes);
                    setEditingNotes(false);
                  }}
                >
                  Cancel
                </button>
                <button className="button primary" onClick={finishNotes}>
                  Save notes
                </button>
              </div>
            </>
          ) : (
            <div className="notes-display">{notes || "No notes yet."}</div>
          )}
        </section>
        <section className="detail-section">
          <div className="section-heading">
            <div>
              <h2>Follow-ups</h2>
              <p>Click an item to preview its message.</p>
            </div>
            {schedules.some((item) => item.status === "pending") && (
              <button className="button danger" onClick={cancelSequence}>
                Stop all
              </button>
            )}
          </div>
          <div className="compact-list">
            {schedules.map((item) => (
              <button
                className="compact-item"
                key={item.id}
                onClick={() => setSelectedSchedule(item)}
              >
                <span className={`channel-icon ${item.channel}`}>
                  <Icon name={item.channel === "email" ? "mail" : "message"} />
                </span>
                <span>
                  <strong>{channelName(item.channel)}</strong>
                  <small>
                    {formatDate(item.date)} · {formatTime(item.time)}
                  </small>
                </span>
                <span className={`status ${item.status}`}>
                  {item.status === "pending" ? "Upcoming" : capitalize(item.status)}
                </span>
              </button>
            ))}
            {!schedules.length && <p className="muted">No follow-ups scheduled.</p>}
          </div>
        </section>
      </div>
      <section className="detail-section history-section">
        <div className="section-heading">
          <div>
            <h2>Activity</h2>
            <p>Contact updates and completed actions.</p>
          </div>
        </div>
        <div className="history-list">
          {contact.history.map((item) => (
            <div key={item.id}>
              <span className="history-marker" />
              <div>
                <strong>{formatDate(item.date)}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {showEdit && (
        <ContactModal contact={contact} setData={setData} onClose={() => setShowEdit(false)} />
      )}
      {scheduleChannel && (
        <FollowUpModal
          channel={scheduleChannel}
          contact={contact}
          data={data}
          setData={setData}
          onClose={() => setScheduleChannel(null)}
        />
      )}
      {selectedSchedule && (
        <EventModal
          event={selectedSchedule}
          contact={contact}
          setData={setData}
          onClose={() => setSelectedSchedule(null)}
        />
      )}
    </div>
  );
}

function Templates({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const [editing, setEditing] = useState<MessageTemplate | null | undefined>(undefined);
  const [newChannel, setNewChannel] = useState<"email" | "sms">("email");
  const remove = (id: string) =>
    setData((current) => ({
      ...current,
      templates: current.templates.filter((item) => item.id !== id),
    }));
  const openNew = (channel: "email" | "sms") => {
    setNewChannel(channel);
    setEditing(null);
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Reusable outreach" title="Templates" />
      <div className="template-grid">
        {(["email", "sms"] as const).map((channel) => (
          <section className={`template-column ${channel}-template`} key={channel}>
            <div className="template-title">
              <span className={`channel-icon ${channel}`}>
                <Icon name={channel === "email" ? "mail" : "message"} />
              </span>
              <div>
                <strong>{channel === "email" ? "Email" : "SMS"}</strong>
                <small>
                  {channel === "email"
                    ? "Subject and full message drafts"
                    : "Own-phone message drafts"}
                </small>
              </div>
              <button className="button" onClick={() => openNew(channel)}>
                <Icon name="plus" />
                Add
              </button>
            </div>
            <div className="template-list">
              {data.templates
                .filter((item) => item.channel === channel)
                .map((template) => (
                  <article className="template-card" key={template.id}>
                    <strong>{template.name}</strong>
                    {template.subject && <small>Subject: {template.subject}</small>}
                    <p>{template.body}</p>
                    <div>
                      <button className="button" onClick={() => setEditing(template)}>
                        Edit
                      </button>
                      <button className="button danger" onClick={() => remove(template.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              {!data.templates.some((item) => item.channel === channel) && (
                <p className="muted">No {channel === "email" ? "email" : "SMS"} templates yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
      <p className="privacy-note">
        Messages open as drafts in your email or phone app. This CRM does not send messages or use a
        paid messaging service.
      </p>
      {editing !== undefined && (
        <TemplateModal
          template={editing}
          channel={editing?.channel ?? newChannel}
          setData={setData}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function Schedule({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const torontoNow = getTorontoParts();
  const now = new Date(
    Number(torontoNow.year),
    Number(torontoNow.month) - 1,
    Number(torontoNow.day),
  );
  const wheelGestureHandled = useRef(false);
  const activeWheelDirection = useRef<1 | -1 | 0>(0);
  const reverseWheelDistance = useRef(0);
  const wheelResetTimer = useRef<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [monthDirection, setMonthDirection] = useState<1 | -1>(1);
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [newDate, setNewDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<FollowUp | null>(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const number = index - firstDay + 1;
    const date = new Date(year, month, number);
    const inMonth = number > 0 && number <= daysInMonth;
    return {
      date,
      inMonth,
      day: inMonth ? number : number <= 0 ? prevDays + number : number - daysInMonth,
    };
  });
  const toISO = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const movement = event.deltaY;
      if (Math.abs(movement) < 2) return;
      const gestureDirection: 1 | -1 = movement > 0 ? 1 : -1;
      if (wheelResetTimer.current) window.clearTimeout(wheelResetTimer.current);
      wheelResetTimer.current = window.setTimeout(() => {
        wheelGestureHandled.current = false;
        activeWheelDirection.current = 0;
        reverseWheelDistance.current = 0;
      }, 120);
      if (wheelGestureHandled.current) {
        if (activeWheelDirection.current === gestureDirection) return;
        reverseWheelDistance.current += Math.abs(movement);
        if (reverseWheelDistance.current < 32) return;
      }
      wheelGestureHandled.current = true;
      activeWheelDirection.current = gestureDirection;
      reverseWheelDistance.current = 0;
      setMonthDirection(gestureDirection);
      setCursor(
        (current) => new Date(current.getFullYear(), current.getMonth() + gestureDirection, 1),
      );
    };
    calendar.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      calendar.removeEventListener("wheel", handleWheel);
      if (wheelResetTimer.current) window.clearTimeout(wheelResetTimer.current);
    };
  }, []);
  const moveMonth = (delta: number) => {
    setMonthDirection(delta > 0 ? 1 : -1);
    setCursor(new Date(year, month + delta, 1));
  };
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2025, index, 1)),
  );
  const yearOptions = Array.from(
    new Set([
      ...Array.from({ length: 7 }, (_, index) => now.getFullYear() - 2 + index),
      year,
    ]),
  ).sort((a, b) => a - b);

  return (
    <div className="page schedule-page">
      <PageHeader
        eyebrow="Follow-up planner"
        title="Schedule"
        actions={
          <button className="button primary" onClick={() => setNewDate(todayISO())}>
            <Icon name="plus" />
            New follow-up
          </button>
        }
      />
      <div className="calendar-toolbar">
        <div className="calendar-nav-group">
          <button
            className="button"
            onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
          >
            Today
          </button>
          <div className="month-nav">
            <button
              className="icon-button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
            >
              <Icon name="chevronLeft" />
            </button>
            <h2
              className={`month-title month-${monthDirection > 0 ? "next" : "previous"}`}
              key={`${year}-${month}`}
            >
              {months[month]} {year}
            </h2>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="Next month">
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
        <div className="date-pickers">
          <select
            aria-label="Month"
            value={month}
            onChange={(event) => setCursor(new Date(year, Number(event.target.value), 1))}
          >
            {months.map((name, index) => (
              <option value={index} key={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            value={year}
            onChange={(event) => setCursor(new Date(Number(event.target.value), month, 1))}
          >
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="calendar" ref={calendarRef} title="Scroll up or down to change month">
        <div className="weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div
          className={`calendar-grid month-${monthDirection > 0 ? "next" : "previous"}`}
          key={`${year}-${month}`}
        >
          {cells.map(({ date, inMonth, day }) => {
            const iso = toISO(date);
            const canSchedule = inMonth && iso >= todayISO();
            const events = data.followUps.filter(
              (item) => item.date === iso && item.status !== "cancelled",
            );
            return (
              <div
                key={iso}
                className={`calendar-day ${inMonth ? "" : "outside"} ${inMonth && !canSchedule ? "past" : ""} ${iso === todayISO() ? "today" : ""}`}
                onClick={() => canSchedule && setNewDate(iso)}
              >
                {canSchedule ? (
                  <button
                    type="button"
                    className="day-number"
                    aria-label={`Add follow-up on ${formatDate(iso)}`}
                  >
                    {day}
                  </button>
                ) : (
                  <span className="day-number">{day}</span>
                )}
                <span className="events">
                  {events.slice(0, 3).map((event) => {
                    const contact = data.contacts.find((item) => item.id === event.contactId);
                    return (
                      <button
                        type="button"
                        key={event.id}
                        className={`event-chip ${event.channel}`}
                        onClick={(click) => {
                          click.stopPropagation();
                          setSelected(event);
                        }}
                      >
                        {contact ? `${contact.firstName} ${contact.lastName}` : "Contact"} ·{" "}
                        {channelName(event.channel)}
                      </button>
                    );
                  })}
                  {events.length > 3 && (
                    <span className="more-events">+{events.length - 3} more</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {newDate && (
        <NewScheduleModal
          date={newDate}
          data={data}
          setData={setData}
          onClose={() => setNewDate(null)}
        />
      )}
      {selected && (
        <EventModal
          event={selected}
          contact={data.contacts.find((item) => item.id === selected.contactId)}
          setData={setData}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Profile({
  data,
  setData,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="page">
      <PageHeader
        eyebrow="Account and sending details"
        title="Profile"
        actions={
          <button className="button primary" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        }
      />
      <div className="profile-layout">
        <div className="profile-identity">
          <span className="profile-avatar">
            {data.owner.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <h2>{data.owner.name}</h2>
            <p>{data.owner.role}</p>
          </div>
        </div>
        <dl className="profile-details">
          <div>
            <dt>Company</dt>
            <dd>
          <a href={websiteHref(data.owner.site)} target="_blank" rel="noreferrer">
                {data.owner.company}
              </a>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${data.owner.email}`}>{data.owner.email}</a>
            </dd>
          </div>
          <div>
            <dt>🇨🇦 Phone</dt>
            <dd>
              <a href={`tel:${data.owner.caPhone}`}>{data.owner.caPhone}</a>
            </dd>
          </div>
          <div>
            <dt>🇺🇸 Phone</dt>
            <dd>
              {data.owner.usPhone ? (
                <a href={`tel:${data.owner.usPhone}`}>{data.owner.usPhone}</a>
              ) : (
                "Not set"
              )}
            </dd>
          </div>
        </dl>
      </div>
      {editing && (
        <ProfileEditModal data={data} setData={setData} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function Modal({
  title,
  eyebrow,
  children,
  footer,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousActive =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  );
}

function ProfileEditModal({
  data,
  setData,
  onClose,
}: {
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
  onClose: () => void;
}) {
  const [owner, setOwner] = useState(data.owner);
  const ownerValid = Boolean(
    owner.name.trim() &&
    owner.company.trim() &&
    isValidWebsite(owner.site) &&
    isValidEmail(owner.email) &&
    owner.caPhone.trim(),
  );
  const save = () => {
    if (!ownerValid) return;
    setData((current) => ({ ...current, owner }));
    onClose();
  };
  return (
    <Modal
      title="Edit profile"
      eyebrow={owner.name}
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!ownerValid} onClick={save}>
            Save changes
          </button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Name">
          <input
            autoComplete="name"
            value={owner.name}
            onChange={(event) => setOwner({ ...owner, name: event.target.value })}
          />
        </Field>
        <Field label="Role">
          <input
            value={owner.role}
            onChange={(event) => setOwner({ ...owner, role: event.target.value })}
          />
        </Field>
        <Field label="Company">
          <input
            autoComplete="organization"
            value={owner.company}
            onChange={(event) => setOwner({ ...owner, company: event.target.value })}
          />
        </Field>
        <Field label="Company site">
          <input
            type="url"
            value={owner.site}
            onChange={(event) => setOwner({ ...owner, site: event.target.value })}
          />
        </Field>
        <Field label="Email" wide>
          <input
            type="email"
            autoComplete="email"
            value={owner.email}
            onChange={(event) => setOwner({ ...owner, email: event.target.value })}
          />
        </Field>
        <Field label="🇨🇦 Phone">
          <input
            type="tel"
            autoComplete="tel"
            value={owner.caPhone}
            onChange={(event) => setOwner({ ...owner, caPhone: event.target.value })}
          />
        </Field>
        <Field label="🇺🇸 Phone">
          <input
            type="tel"
            placeholder="Not set"
            value={owner.usPhone}
            onChange={(event) => setOwner({ ...owner, usPhone: event.target.value })}
          />
        </Field>
        {!ownerValid && (
          <p className="form-error field wide">
            Name, company, site, valid email, and Canadian phone are required.
          </p>
        )}
      </div>
    </Modal>
  );
}

function ContactModal({
  contact,
  setData,
  onClose,
}: {
  contact?: Contact;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    company: contact?.company ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    region: contact?.region ?? ("CA" as Region),
    notes: contact?.notes ?? "",
  });
  const formValid = Boolean(form.firstName.trim() && form.phone.trim() && isValidEmail(form.email));
  const save = () => {
    if (!formValid) return;
    if (contact) {
      setData((current) => ({
        ...current,
        contacts: current.contacts.map((item) =>
          item.id === contact.id
            ? {
                ...item,
                ...form,
                updatedAt: new Date().toISOString(),
                history: [
                  { id: crypto.randomUUID(), date: todayISO(), text: "Contact details updated." },
                  ...item.history,
                ],
              }
            : item,
        ),
      }));
    } else {
      const newContact: Contact = {
        ...form,
        id: crypto.randomUUID(),
        replied: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{ id: crypto.randomUUID(), date: todayISO(), text: "Contact added." }],
      };
      setData((current) => ({ ...current, contacts: [newContact, ...current.contacts] }));
    }
    onClose();
  };
  return (
    <Modal
      title={contact ? "Edit contact" : "New contact"}
      eyebrow="Relationship pipeline"
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!formValid} onClick={save}>
            Save contact
          </button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="First name">
          <input
            autoFocus
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
        </Field>
        <Field label="Last name">
          <input
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
        </Field>
        <Field label="Company (optional)">
          <input
            autoComplete="organization"
            value={form.company}
            onChange={(event) => setForm({ ...form, company: event.target.value })}
          />
        </Field>
        <Field label="Region">
          <select
            value={form.region}
            onChange={(event) => setForm({ ...form, region: event.target.value as Region })}
          >
            <option value="CA">🇨🇦 Canada</option>
            <option value="US">🇺🇸 United States</option>
          </select>
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>
        <Field label="Notes" wide>
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </Field>
        {!formValid && (
          <p className="form-error field wide">First name, phone, and email are required.</p>
        )}
      </div>
    </Modal>
  );
}

function FollowUpModal({
  channel,
  contact,
  data,
  setData,
  onClose,
}: {
  channel: Channel;
  contact: Contact;
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
  onClose: () => void;
}) {
  const isEmail = channel === "email";
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(defaultDueTime());
  const contactReady = isEmail ? Boolean(contact.email) : Boolean(contact.phone);
  const timeValid = !isPastToronto(date, time);
  const scheduleValid = contactReady && timeValid;
  const save = () => {
    if (!scheduleValid) return;
    const ownerPhone = contact.region === "US" ? data.owner.usPhone : data.owner.caPhone;
    const companyReference = contact.company ? ` at ${contact.company}` : "";
    const emailDraft = `Hi ${contact.firstName},\n\nI’m following up from Future Buildings about your project${companyReference}. What would be a good time for a quick call?\n\nJosh Schwartz`;
    const callbackText = ownerPhone
      ? ` Reply here or call ${ownerPhone} when convenient.`
      : " Reply here when convenient.";
    const followUp: FollowUp = {
      id: crypto.randomUUID(),
      contactId: contact.id,
      channel,
      date,
      time: padTime(time),
      status: "pending",
      subject: isEmail ? "Your Future Buildings project" : "",
      draft: isEmail
        ? emailDraft
        : `Hi ${contact.firstName}, it’s ${data.owner.name} from ${data.owner.company}. I’m following up about your project${companyReference}.${callbackText}`,
    };
    setData((current) => ({
      ...current,
      followUps: [...current.followUps, followUp],
      contacts: current.contacts.map((item) =>
        item.id === contact.id
          ? {
              ...item,
              replied: false,
              updatedAt: new Date().toISOString(),
              history: [
                {
                  id: crypto.randomUUID(),
                  date: todayISO(),
                  text: `${channelName(channel)} follow-up scheduled.`,
                },
                ...item.history,
              ],
            }
          : item,
      ),
    }));
    onClose();
  };
  return (
    <Modal
      title={isEmail ? "Schedule email" : "Schedule SMS"}
      eyebrow={`${contact.firstName} ${contact.lastName}`}
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!scheduleValid} onClick={save}>
            {isEmail ? "Schedule email" : "Schedule SMS"}
          </button>
        </>
      }
    >
      <p className="schedule-explainer">
        Pick a date and time when you are ready. This creates a reminder and a prepared draft.
        Messages are never sent automatically.
      </p>
      <div className={`channel-schedule ${isEmail ? "email-schedule" : "sms-schedule"}`}>
        <div className="channel-schedule-title">
          <span className={`channel-icon ${isEmail ? "" : "sms"}`}>
            <Icon name={isEmail ? "mail" : "message"} />
          </span>
          <div>
            <strong>{isEmail ? "Email" : "SMS"}</strong>
            <small>
              {isEmail
                ? "Scheduled separately from SMS."
                : "Scheduled separately from email."}
            </small>
          </div>
        </div>
        <div className="form-grid two">
          <Field label="Date">
            <input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>
      </div>
      {!timeValid && (
        <p className="form-error">
          {isEmail ? "Email" : "SMS"} must be scheduled in the future.
        </p>
      )}
      {!contactReady && (
        <p className="form-error">
          {isEmail
            ? "Add an email address to this contact first."
            : "Add a phone number to this contact first."}
        </p>
      )}
      {!isEmail && (
        <p className="line-preview">
          Draft callback number: {contact.region === "CA" ? "🇨🇦" : "🇺🇸"}{" "}
          {contact.region === "CA" ? data.owner.caPhone : data.owner.usPhone || "not set"}
        </p>
      )}
    </Modal>
  );
}

function NewScheduleModal({
  date,
  data,
  setData,
  onClose,
}: {
  date: string;
  data: CRMData;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    contactId: data.contacts[0]?.id ?? "",
    channel: "email" as Channel,
    date,
    time: date === todayISO() ? defaultDueTime() : "09:30",
    subject: "",
    draft: "",
  });
  const targetContact = data.contacts.find((contact) => contact.id === form.contactId);
  const hasContacts = data.contacts.length > 0;
  const contactMethodAvailable = Boolean(
    targetContact && (form.channel === "email" ? targetContact.email : targetContact.phone),
  );
  const formValid = Boolean(
    hasContacts &&
    form.contactId &&
    contactMethodAvailable &&
    form.date &&
    form.time &&
    !isPastToronto(form.date, form.time),
  );
  const save = () => {
    if (!formValid) return;
    setData((current) => ({
      ...current,
      followUps: [
        ...current.followUps,
        {
          ...form,
          time: padTime(form.time),
          id: crypto.randomUUID(),
          status: "pending",
        },
      ],
      contacts: current.contacts.map((contact) =>
        contact.id === form.contactId
          ? {
              ...contact,
              replied: false,
              updatedAt: new Date().toISOString(),
              history: [
                {
                  id: crypto.randomUUID(),
                  date: todayISO(),
                  text: `${channelName(form.channel)} follow-up scheduled.`,
                },
                ...contact.history,
              ],
            }
          : contact,
      ),
    }));
    onClose();
  };
  return (
    <Modal
      title="Schedule follow-up"
      eyebrow={formatDate(date)}
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!formValid} onClick={save}>
            Schedule {form.channel === "email" ? "email" : "SMS"}
          </button>
        </>
      }
    >
      <p className="schedule-explainer">
        Schedule one email or one SMS at a time. Channels stay independent.
      </p>
      <div className="form-grid two">
        <Field label="Contact">
          <select
            value={form.contactId}
            disabled={!hasContacts}
            onChange={(event) => setForm({ ...form, contactId: event.target.value })}
          >
            {!hasContacts && <option value="">No contacts yet</option>}
            {data.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Channel">
          <select
            value={form.channel}
            onChange={(event) => setForm({ ...form, channel: event.target.value as Channel })}
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </Field>
        <Field label="Date">
          <input
            type="date"
            min={todayISO()}
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </Field>
        <Field label="Time">
          <input
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
          />
        </Field>
        {form.channel === "email" && (
          <Field label="Subject" wide>
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </Field>
        )}
        <Field label="Message draft" wide>
          <textarea
            value={form.draft}
            onChange={(event) => setForm({ ...form, draft: event.target.value })}
          />
        </Field>
        {!hasContacts && (
          <p className="form-error field wide">Add a contact before scheduling a follow-up.</p>
        )}
        {form.date && form.time && isPastToronto(form.date, form.time) && (
          <p className="form-error field wide">Choose a future date and time.</p>
        )}
        {hasContacts && !contactMethodAvailable && (
          <p className="form-error field wide">
            This contact does not have the required {form.channel === "email" ? "email" : "phone"}.
          </p>
        )}
      </div>
    </Modal>
  );
}

function TemplateModal({
  template,
  channel,
  setData,
  onClose,
}: {
  template: MessageTemplate | null;
  channel: "email" | "sms";
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MessageTemplate>(
    template ?? {
      id: crypto.randomUUID(),
      channel,
      name: "",
      subject: "",
      body: "",
    },
  );
  const save = () => {
    if (!form.name.trim()) return;
    setData((current) => ({
      ...current,
      templates: template
        ? current.templates.map((item) => (item.id === template.id ? form : item))
        : [...current.templates, form],
    }));
    onClose();
  };
  const addToken = (token: string) =>
    setForm((current) => ({
      ...current,
      body: `${current.body}${current.body ? " " : ""}${token}`,
    }));
  return (
    <Modal
      title={template ? "Edit template" : `New ${channel === "email" ? "email" : "SMS"} template`}
      eyebrow="Reusable message"
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!form.name.trim()} onClick={save}>
            Save template
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Template title">
          <input
            autoFocus
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        {channel === "email" && (
          <Field label="Subject">
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </Field>
        )}
        <div className="token-bar modal-tokens">
          <span>Tap to add into the message:</span>
          {[
            ["First name", "[First name]"],
            ["Full name", "[Full name]"],
            ["Company", "[Company]"],
          ].map(([label, token]) => (
            <button key={token} className="token" onClick={() => addToken(token)}>
              {label}
            </button>
          ))}
        </div>
        <Field label="Message">
          <textarea
            className="template-editor"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}

function EventModal({
  event,
  contact,
  setData,
  onClose,
}: {
  event: FollowUp;
  contact?: Contact;
  setData: React.Dispatch<React.SetStateAction<CRMData>>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(event);
  const [isEditing, setIsEditing] = useState(false);
  const canOpenDraft = Boolean(
    contact && (event.channel === "email" ? contact.email : contact.phone),
  );
  const update = (status: FollowUp["status"]) => {
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) =>
        item.id === event.id ? { ...item, status } : item,
      ),
      contacts: current.contacts.map((item) =>
        item.id === event.contactId
          ? {
              ...item,
              updatedAt: new Date().toISOString(),
              history: [
                {
                  id: crypto.randomUUID(),
                  date: todayISO(),
                  text: `${channelName(event.channel)} follow-up ${status === "done" ? "completed" : "cancelled"}.`,
                },
                ...item.history,
              ],
            }
          : item,
      ),
    }));
    onClose();
  };
  const save = () => {
    const next = { ...form, time: padTime(form.time) };
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) => (item.id === event.id ? next : item)),
    }));
    setForm(next);
    setIsEditing(false);
  };
  const openContact = () => {
    if (contact) navigate(`/contacts/${contact.id}`);
    onClose();
  };
  const footer = isEditing ? (
    <>
      <button
        className="button"
        onClick={() => {
          setForm(event);
          setIsEditing(false);
        }}
      >
        Cancel
      </button>
      <button className="button primary" onClick={save}>
        Save changes
      </button>
    </>
  ) : (
    <>
      <button className="button danger" onClick={() => update("cancelled")}>
        Cancel follow-up
      </button>
      {contact && (
        <button className="button" onClick={openContact}>
          Open contact
        </button>
      )}
      <button className="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>
      <button className="button" onClick={() => update("done")}>
        <Icon name="check" />
        Done
      </button>
      {canOpenDraft && contact && (
        <button className="button primary" onClick={() => openDraft(form, contact)}>
          Open draft
        </button>
      )}
    </>
  );
  return (
    <Modal
      title={`${formatDate(form.date)} at ${formatTime(form.time)}`}
      eyebrow={`${channelName(event.channel)} follow-up`}
      onClose={onClose}
      footer={footer}
    >
      <div className="event-recipient">
        <div>
          <strong>
            {event.channel === "sms"
              ? contact
                ? `${contact.region === "CA" ? "🇨🇦" : "🇺🇸"} ${contact.phone}`
                : "Unknown phone"
              : contact?.email || "Unknown email"}
          </strong>
          {contact && (
            <small>
              {contact.firstName} {contact.lastName}
              {contact.company && ` · ${contact.company}`}
            </small>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="form-grid two event-form">
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(change) => setForm({ ...form, date: change.target.value })}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={form.time}
              onChange={(change) => setForm({ ...form, time: change.target.value })}
            />
          </Field>
          {form.channel === "email" && (
            <Field label="Subject" wide>
              <input
                value={form.subject}
                onChange={(change) => setForm({ ...form, subject: change.target.value })}
              />
            </Field>
          )}
          <Field label="Message draft" wide>
            <textarea
              value={form.draft}
              onChange={(change) => setForm({ ...form, draft: change.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="event-preview">
          {form.subject && (
            <div>
              <span>Subject</span>
              <strong>{form.subject}</strong>
            </div>
          )}
          <div>
            <span>Message preview</span>
            <p>{form.draft || "No message added."}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const dateValue = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
};
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateValue(date));
const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    dateValue(date),
  );
const formatTime = (time: string) => {
  const normalized = padTime(time);
  const [hourValue, minute] = normalized.split(":");
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return time || "12:00 AM";
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};
const channelName = (channel: Channel) => (channel === "sms" ? "SMS" : "Email");
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function App() {
  const [data, setData] = useCRM();
  return (
    <HashRouter>
      <AppShell data={data} setData={setData} />
    </HashRouter>
  );
}
