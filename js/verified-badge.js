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

          <!-- Wobbly / scalloped badge -->
          <path
            class="verified-badge-shape"
            d="
              M50 3
              C56 3 61 9 65 12
              C70 9 78 9 82 13
              C86 17 85 24 88 28
              C94 30 98 35 97 41
              C96 47 91 51 92 55
              C94 61 91 67 86 70
              C87 76 83 82 77 84
              C72 85 68 82 64 86
              C60 91 55 97 50 97
              C44 97 40 91 36 86
              C32 82 28 85 23 84
              C17 82 13 76 14 70
              C9 67 6 61 8 55
              C9 51 4 47 3 41
              C2 35 6 30 12 28
              C15 24 14 17 18 13
              C22 9 30 9 35 12
              C39 9 44 3 50 3
              Z
            "
          />

          <!-- White check -->
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
