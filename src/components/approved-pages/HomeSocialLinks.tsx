import { FaDiscord, FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";

// Official profile URLs already used by /links and /contact. Facebook and
// YouTube also reconfirmed in the October 14 user brief.
const profiles = [
  { name: "Facebook", url: "https://www.facebook.com/dancewithceech", Icon: FaFacebookF },
  { name: "Instagram", url: "https://www.instagram.com/dancewithceech", Icon: FaInstagram },
  { name: "TikTok", url: "https://www.tiktok.com/@dancewithceech", Icon: FaTiktok },
  { name: "YouTube", url: "https://www.youtube.com/@dancewithceech", Icon: FaYoutube },
  { name: "Discord", url: "https://discord.gg/AXU5nQvdj3", Icon: FaDiscord },
];

export default function HomeSocialLinks() {
  return <nav id="connect" aria-label="Ceech’s social profiles" className="border-t border-white/10 px-6 py-6">
    <ul className="flex flex-wrap items-center justify-center gap-3">
      {profiles.map(({ name, url, Icon }) => <li key={name}>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-muted transition-colors hover:border-accent-primary-accessible hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-primary-accessible">
          <Icon size={22} aria-hidden="true" focusable="false" />
        </a>
      </li>)}
    </ul>
  </nav>;
}
