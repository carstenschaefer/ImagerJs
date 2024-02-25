const icons = {};

export function getIcon(name) {
  if (!icons[name]) {
    console.warn("icon not found", name);
    return "&times;";
  }

  return icons[name];
}
