// ===== Pedro Connect – Verified Badge =====
(function (global) {

  function escapeHtml(value) {
    if (value == null) return '';

    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function isVerified(source) {
    if (source == null) return false;

    if (typeof source === 'boolean') return source;
    if (typeof source === 'number') return source === 1;

    if (typeof source === 'string') {
      const v = source.trim().toLowerCase();
      return (
        v === 'true' ||
        v === '1' ||
        v === 't' ||
        v === 'yes'
      );
    }

    return isVerified(
      source.is_verified ?? source.verified
    );
  }

 function renderVerifiedBadge(source) {
  if (!isVerified(source)) return '';

  return `
    <span
      class="verified-badge"
      title="Verified"
      aria-label="Verified"
      role="img"
    >
      <svg
        class="verified-badge-svg"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >

        <!-- WOBBLY BLUE VERIFIED BADGE -->
        <path
          class="verified-badge-shape"
          d="
            M50 2

            C57 2 62 8 65 13
            C71 10 78 9 83 14
            C87 18 87 24 87 29

            C94 31 98 36 98 43
            C98 49 93 53 90 56

            C93 62 91 69 86 73
            C82 77 77 77 72 76

            C70 83 65 88 59 89
            C55 90 52 96 50 98

            C45 98 42 91 38 89
            C32 88 28 83 27 77

            C21 78 16 76 13 71
            C10 66 10 61 12 56

            C7 53 2 48 2 42
            C2 35 7 31 13 29

            C13 23 14 18 19 14
            C24 10 30 11 35 13

            C39 7 44 2 50 2
            Z
          "
        />

        <!-- WHITE CHECK -->
        <path
          class="verified-badge-check"
          d="M27 51 L43 67 L73 34"
        />

      </svg>
    </span>
  `;
}
  
  function renderUserName(profile, options) {
    const opts = options || {};

    const display = escapeHtml(
      (profile && (
        profile.display_name ||
        profile.username
      )) || 'Unknown'
    );

    return `
      <span class="user-name${opts.className ? ' ' + escapeHtml(opts.className) : ''}">
        <span class="user-name-text">${display}</span>
        ${renderVerifiedBadge(profile)}
      </span>
    `;
  }

  global.escapeHtml = escapeHtml;
  global.isVerified = isVerified;
  global.renderVerifiedBadge = renderVerifiedBadge;
  global.renderUserName = renderUserName;

})(window);
