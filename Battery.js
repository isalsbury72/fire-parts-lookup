/* battery.js v5.3.8
   Battery Capacity Calculator
   Formula:
   C = L × [(Iq × Tq) + Fc × (Ia × Ta)]
   L = 1
   Fc = 2
   Ta default = 0.5 (locked)
   Tq = 24 or 72 via buttons
*/

(function () {

  // CONSTANTS
  const L = 1;
  const FC = 2;
  const TA = 0.5;

  // ELEMENTS
  const iqEl = document.getElementById("iq");
  const iaEl = document.getElementById("ia");
  const tqEl = document.getElementById("tq");
  const taEl = document.getElementById("ta");

  const cap20El = document.getElementById("cap20");
  const ageCapEl = document.getElementById("ageCap");
  const reqCapEl = document.getElementById("reqCap");

  const btnTq24 = document.getElementById("btnTq24");
  const btnTq72 = document.getElementById("btnTq72");

  // SET FIXED VALUES
  taEl.value = TA.toString();

  // MAIN CALC FUNCTION
  function recalc() {
    const Iq = parseFloat(iqEl.value) || 0;
    const Ia = parseFloat(iaEl.value) || 0;
    const Tq = parseFloat(tqEl.value) || 0;

    // MAIN FORMULA
    const cap20 = L * ((Iq * Tq) + (FC * (Ia * TA)));  
    const ageCap = cap20 * 1.25;
    const reqCap = ageCap;

    // DISPLAY RESULTS (always 2 dp)
    cap20El.textContent = cap20.toFixed(2);
    ageCapEl.textContent = ageCap.toFixed(2);
    reqCapEl.textContent = reqCap.toFixed(2);
  }

  // EVENT LISTENERS
  iqEl.addEventListener("input", recalc);
  iaEl.addEventListener("input", recalc);

  // TQ BUTTONS
  btnTq24.addEventListener("click", () => {
    tqEl.value = "24";
    recalc();
  });

  btnTq72.addEventListener("click", () => {
    tqEl.value = "72";
    recalc();
  });

  // INITIAL CALC
  recalc();

})();

