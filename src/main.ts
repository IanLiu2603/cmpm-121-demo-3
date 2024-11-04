// todo
const APP_NAME = "GeoCache";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

//L16 button
const L16 = document.createElement("button");
L16.addEventListener("click", () => alert("you clicked the button!"));
app.append(L16);
