(function () {
const NS = "jimmyllll-win98";
const pvEl = document.getElementById("pv");
if (pvEl) {
fetch("https://api.counterapi.dev/v1/" + NS + "/pv/up")
.then(r => r.json())
.then(d => { pvEl.textContent = (d.count || 0).toLocaleString(); })
.catch(() => { pvEl.textContent = "N/A"; });
}
})();