import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";

//Settings
const startingPoint = leaflet.latLng(36.989525, -122.062760);
const zoom = 19;
const tileWidth = 10;
const cacheSpawnRadius = 8;
const cacheSpawnRate = 0.1;
const luckModifier: string = "test!";

//Initialize Board
const board = new Board(tileWidth, cacheSpawnRadius);

//Intialize Map
const map = leaflet.map(document.getElementById("map")!, {
  center: startingPoint,
  zoom: zoom,
  minZoom: zoom,
  maxZoom: zoom,
  zoomControl: false,
  scrollWheelZoom: false,
});
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

//Intialize Player
const playerLocation = leaflet.marker(startingPoint);
playerLocation.bindTooltip("Current Location");
playerLocation.addTo(map);

let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "0 Points";

//Cache Coin Helper
const coinMap = new Map<string, number>();

//Cache Generation Helper
function makeCache(i: number, j: number) {
  board.getCellForPoint({ i, j });
  const possibleCache = leaflet.rectangle(
    leaflet.latLngBounds(board.getCellBounds({ i, j })),
  );
  console.log(leaflet.latLngBounds(board.getCellBounds({ i, j })));
  possibleCache.addTo(map);

  possibleCache.bindPopup(() => {
    let cachedPoints: number;
    if (coinMap.has(`${i},${j}`)) {
      cachedPoints = coinMap.get(`${i},${j}`)!;
    } else {
      cachedPoints = Math.floor(luck([i, j].toString()) * 100);
      coinMap.set(`${i},${j}`, cachedPoints);
    }
    const popupText: HTMLDivElement = document.createElement("div");
    popupText.innerHTML =
      `<div> Cache at ${i}, ${j}. Cache contains <span id="value">${cachedPoints}</span> available coins.</div>
    <button id="take">Take</button> <button id="place">Place</button>`;
    popupText.querySelector("#take")!.addEventListener("click", () => {
      cachedPoints--;
      coinMap.set(`${i},${j}`, cachedPoints);
      popupText.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        cachedPoints.toString();
      playerPoints++;
      statusPanel.innerHTML = `${playerPoints} points accumulated`;
    });

    popupText.querySelector("#place")!.addEventListener("click", () => {
      if (playerPoints > 0) {
        cachedPoints++;
        coinMap.set(`${i},${j}`, cachedPoints);
        popupText.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cachedPoints.toString();
        playerPoints--;
        statusPanel.innerHTML = `${playerPoints} points accumulated`;
      }
    });
    return popupText;
  });
}

//Generate caches
const nearbyCells = board.getCellsNearPoint(startingPoint);

nearbyCells.forEach((cell) => {
  if (luck([cell.i, cell.j, luckModifier].toString()) < cacheSpawnRate) {
    makeCache(cell.i, cell.j);
  }
});
