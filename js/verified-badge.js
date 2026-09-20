// ===== Pedro Connect – verified badge (single source of truth) =====
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
      return v === 'true' || v === '1' || v === 't' || v === 'yes';
    }
    return isVerified(source.is_verified ?? source.verified);
  }

  function renderVerifiedBadge(source) {
    if (!isVerified(source)) return '';

    return (
      '<span class="verified-badge" title="Verified" aria-label="Verified">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
          '<path d="M3.6 8.35 6.7 11.3 12.4 4.7" />' +
        '</svg>' +
      '</span>'
    );
  }

  function renderUserName(profile, options) {
    const opts = options || {};
    const display = escapeHtml(
      (profile && (profile.display_name || profile.username)) || 'Unknown'
    );

    return (
      '<span class="user-name' + (opts.className ? ' ' + opts.className : '') + '">' +
        '<span class="user-name-text">' + display + '</span>' +
        renderVerifiedBadge(profile) +
      '</span>'
    );
  }

  global.escapeHtml = escapeHtml;
  global.isVerified = isVerified;
  global.renderVerifiedBadge = renderVerifiedBadge;
  global.renderUserName = renderUserName;
})(window);
