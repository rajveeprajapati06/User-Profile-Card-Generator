const form = document.getElementById("profileForm");
const message = document.getElementById("message");
const preview = document.getElementById("preview");
const statusBadge = document.getElementById("statusBadge");
const jsonOutput = document.getElementById("jsonOutput");
const downloadButton = document.getElementById("downloadButton");

let latestCardHtml = "";
let latestProfile = null;

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function setStatus(text) {
  statusBadge.textContent = text;
}

function watchProfileImage() {
  const avatar = preview.querySelector(".avatar-frame");
  const image = preview.querySelector(".avatar-frame img");

  if (!avatar || !image) return;

  const markFallback = () => {
    avatar.classList.add("image-fallback");
    image.remove();
    setMessage("Image URL could not be loaded, so the card used the initials avatar.");
  };

  if (image.complete && image.naturalWidth === 0) {
    markFallback();
    return;
  }

  image.addEventListener("error", markFallback, { once: true });
}

function buildPayload() {
  const formData = new FormData(form);

  return {
    name: formData.get("name"),
    role: formData.get("role"),
    bio: formData.get("bio"),
    imageUrl: formData.get("imageUrl"),
    vibe: formData.get("vibe"),
    palette: formData.get("palette"),
    skills: formData.get("skills")
  };
}

function buildDownloadHtml() {
  const safeTitle = latestProfile ? `${latestProfile.name} Profile Card` : "Profile Card";
  const styles = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px;
      font-family: Arial, sans-serif;
      background: #edf4f2;
    }
    .profile-card {
      position: relative;
      overflow: hidden;
      width: min(720px, 100%);
      color: var(--ink);
      background: linear-gradient(160deg, rgba(255,255,255,.98), rgba(255,255,255,.88)), var(--soft);
      border: 1px solid rgba(20,32,28,.08);
      border-radius: 8px;
      box-shadow: 0 26px 70px var(--glow), 0 20px 50px rgba(18,31,42,.12);
    }
    .card-ribbon { height: 92px; background: linear-gradient(90deg, var(--accent), rgba(255,255,255,0)), var(--soft); }
    .card-main { display: grid; grid-template-columns: 132px 1fr; gap: 24px; align-items: center; padding: 0 34px 26px; }
    .avatar-frame { position: relative; display: grid; place-items: center; width: 132px; height: 132px; margin-top: -34px; padding: 7px; background: linear-gradient(135deg, var(--accent), rgba(255,255,255,.75)), var(--soft); border-radius: 8px; box-shadow: 0 16px 30px rgba(18,31,42,.16); }
    .avatar-frame::before { content: attr(data-initials); position: absolute; inset: 7px; display: grid; place-items: center; color: #fff; background: var(--accent); border-radius: 8px; font-size: 42px; font-weight: 900; }
    .avatar-frame img { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
    .avatar-frame strong { position: absolute; z-index: 2; right: -10px; bottom: -10px; display: grid; width: 46px; height: 46px; place-items: center; color: #fff; background: var(--accent); border: 4px solid #fff; border-radius: 8px; font-size: 16px; font-weight: 900; }
    .card-copy { min-width: 0; padding-top: 20px; }
    .card-kicker { width: fit-content; margin: 0 0 14px; padding: 8px 10px; color: var(--accent); background: var(--soft); border-radius: 8px; font-size: 13px; font-weight: 800; }
    .card-copy h2 { margin: 0; font-size: 34px; line-height: 1.05; }
    .role { margin: 8px 0 0; color: var(--accent); font-weight: 800; }
    .bio { margin: 18px 0 0; color: #53635e; line-height: 1.65; }
    .card-footer { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: end; padding: 0 34px 34px; }
    .skill-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill-row span { padding: 8px 10px; color: var(--ink); background: var(--soft); border-radius: 8px; font-size: 13px; font-weight: 800; }
    .mini-stats { display: flex; gap: 10px; }
    .mini-stats span { min-width: 82px; padding: 10px 12px; text-align: center; background: #f7faf9; border: 1px solid rgba(20,32,28,.08); border-radius: 8px; color: #53635e; font-size: 12px; font-weight: 700; }
    .mini-stats b { display: block; margin-bottom: 4px; color: var(--accent); font-size: 18px; }
    @media (max-width: 680px) {
      .card-main, .card-footer { grid-template-columns: 1fr; }
      .mini-stats { width: 100%; }
      .mini-stats span { flex: 1; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>${styles}</style>
</head>
<body>
  ${latestCardHtml}
</body>
</html>`;
}

function downloadProfileCard() {
  if (!latestCardHtml) return;

  const blob = new Blob([buildDownloadHtml()], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = latestProfile?.name
    ? `${latestProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-profile-card.html`
    : "profile-card.html";

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function generateProfileCard() {
  setStatus("Posting");
  setMessage("Sending your profile details to the backend...");
  preview.className = "preview-empty";
  preview.textContent = "Generating profile card...";

  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPayload())
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Profile card could not be generated.");
    }

    preview.className = "";
    preview.innerHTML = data.cardHtml;
    latestCardHtml = data.cardHtml;
    latestProfile = data.profile;
    downloadButton.disabled = false;
    watchProfileImage();
    jsonOutput.textContent = JSON.stringify(data.profile, null, 2);
    setStatus("Created");
    setMessage(data.message);
  } catch (error) {
    setStatus("Error");
    downloadButton.disabled = true;
    latestCardHtml = "";
    latestProfile = null;
    preview.className = "preview-empty";
    preview.textContent = "The backend rejected the POST request.";
    setMessage(error.message, true);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  generateProfileCard();
});

downloadButton.addEventListener("click", downloadProfileCard);

generateProfileCard();
