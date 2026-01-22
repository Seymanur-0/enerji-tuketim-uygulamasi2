document.addEventListener('DOMContentLoaded', () => {
    // --- HTML Elementlerini Seçme ---
    const kwhPrice1stSpan = document.getElementById('kwhPrice1st');
    const kwhPrice2ndSpan = document.getElementById('kwhPrice2nd');
    const deviceInputsDiv = document.getElementById('deviceInputs');
    const currentKwhSpan = document.getElementById('currentKwh');
    const currentCostSpan = document.getElementById('currentCost');
    const monthlyKwhSpan = document.getElementById('monthlyKwh');
    const monthlyCostSpan = document.getElementById('monthlyCost');
    const scenarioCheckboxesDiv = document.getElementById('scenarioCheckboxes');
    const savingsKwhSpan = document.getElementById('savingsKwh');
    const savingsCostSpan = document.getElementById('savingsCost');

    // --- Sabitler ve Güncel Fiyatlar (Türkiye - Kademeli Tarife) ---
    // Bu fiyatlar genel bilgilendirme amaçlıdır, güncel değerler değişebilir.
    const KWH_LIMIT_1ST_STEP = 240; // İlk kademe kWh limiti (aylık)
    const KWH_PRICE_1ST_STEP_GROSS = 2.25; // İlk kademe birim fiyatı (vergiler dahil)
    const KWH_PRICE_2ND_STEP_GROSS = 3.40; // İkinci kademe birim fiyatı (vergiler dahil)

    // Fiyat bilgilerini HTML'e yansıt
    kwhPrice1stSpan.textContent = KWH_PRICE_1ST_STEP_GROSS.toFixed(2);
    kwhPrice2ndSpan.textContent = KWH_PRICE_2ND_STEP_GROSS.toFixed(2);

    // --- Cihaz Tanımlamaları ---
    // type: 'alwaysOn' -> 24 saat açık kabul edilir (örn: buzdolabı)
    // type: 'manual' -> Kullanıcının manuel giriş yapması beklenir
    // type: 'hidden' -> Sadece senaryolar için kullanılan, ana listede görünmeyen cihazlar
    const devices = [
        { id: 'refrigerator', name: 'Buzdolabı', defaultPower: 150, defaultHours: 24, type: 'alwaysOn', icon: 'fas fa-snowflake' },
        { id: 'tv', name: 'Televizyon', defaultPower: 100, defaultHours: 4, type: 'manual', icon: 'fas fa-tv' },
        { id: 'washingMachine', name: 'Çamaşır Makinesi', defaultPower: 2000, defaultHours: 0.5, type: 'manual', icon: 'fas fa-washer' }, // Yarım saat
        { id: 'iron', name: 'Ütü', defaultPower: 1000, defaultHours: 0.2, type: 'manual', icon: 'fas fa-tshirt' }, // 12 dakika
        { id: 'computer', name: 'Bilgisayar', defaultPower: 200, defaultHours: 6, type: 'manual', icon: 'fas fa-laptop' },
        { id: 'dishwasher', name: 'Bulaşık Makinesi', defaultPower: 1500, defaultHours: 1, type: 'manual', icon: 'fas fa-hand-sparkles' },
        { id: 'airConditioner', name: 'Klima', defaultPower: 1500, defaultHours: 3, type: 'manual', icon: 'fas fa-fan' },
        { id: 'waterHeater', name: 'Elektrikli Su Isıtıcı', defaultPower: 2000, defaultHours: 0.25, type: 'manual', icon: 'fas fa-water' },
        { id: 'ledBulb', name: 'LED Ampul (1 adet)', defaultPower: 10, defaultHours: 6, type: 'manual', icon: 'far fa-lightbulb' },
        { id: 'oldBulb', name: 'Eski Ampul (1 adet)', defaultPower: 60, defaultHours: 0, type: 'hidden', icon: 'far fa-lightbulb' } // Senaryo için gizli
    ];

    // --- Tasarruf Senaryoları --- (Yeni ikonlar eklendi)
    const scenarios = [
        { id: 'tvLess1hr', name: 'Televizyonu günde 1 saat az kullan', deviceId: 'tv', reduction: 1, type: 'hours', icon: 'fas fa-tv' },
        { id: 'wmLess1time', name: 'Çamaşır makinesini haftada 1 kez az çalıştır (günlük)', deviceId: 'washingMachine', reduction: (0.5 / 7), type: 'hours', icon: 'fas fa-washer' },
        { id: 'ironLess10min', name: 'Ütüyü günde 10 dakika az kullan', deviceId: 'iron', reduction: (10 / 60), type: 'hours', icon: 'fas fa-tshirt' },
        { id: 'allLed', name: '5 adet eski ampulü LED ile değiştir', type: 'switch_bulb', oldBulbDeviceId: 'oldBulb', ledBulbDeviceId: 'ledBulb', numberOfBulbs: 5, bulbHours: 6, icon: 'fas fa-lightbulb' },
        { id: 'dishwasherEcoMode', name: 'Bulaşık makinesini eko modda çalıştır (10% tasarruf)', deviceId: 'dishwasher', reductionPercentage: 0.10, type: 'percentage_reduction', icon: 'fas fa-leaf' },
        { id: 'acLess1hr', name: 'Klima kullanımını günde 1 saat azalt', deviceId: 'airConditioner', reduction: 1, type: 'hours', icon: 'fas fa-fan' },
        { id: 'unplugStandby', name: 'Standby cihazları fişten çek (Günlük 0.05 kWh tasarruf)', type: 'fixed_kwh_reduction', kwhReduction: 0.05, icon: 'fas fa-power-off' },
        { id: 'waterHeaterLess5min', name: 'Su ısıtıcı kullanımını günde 5 dakika azalt', deviceId: 'waterHeater', reduction: (5 / 60), type: 'hours', icon: 'fas fa-water' },
        { id: 'lowerThermostat', name: 'Termostatı 1 derece düşür (Aylık 20 kWh tasarruf)', type: 'fixed_kwh_reduction', kwhReduction: (20 / 30), icon: 'fas fa-thermometer-half' } // Aylık 20 kWh'i günlük ortalamaya çevir
    ];

    let currentDeviceUsages = {}; // Kullanıcının girdiği kullanım sürelerini saklar
    let currentDevicePowers = {}; // Kullanıcının girdiği cihaz güçlerini

    // --- Yardımcı Fonksiyon: Sayı Animasyonu ---
    function animateNumber(element, start, end, duration, prefix = '', suffix = '') {
        let startTime = null;
        const decimalPlaces = (end % 1 !== 0) ? 2 : 0; // Eğer ondalıklıysa 2 basamak, değilse 0

        function step(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const currentValue = start + (end - start) * progress;
            element.textContent = `${prefix}${currentValue.toFixed(decimalPlaces)}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    // --- Render Fonksiyonları ---

    // Alet girişlerini HTML'e ekler
    function renderDeviceInputs() {
        deviceInputsDiv.innerHTML = '';
        devices.filter(d => d.type !== 'hidden').forEach(device => {
            const div = document.createElement('div');
            div.classList.add('input-item');
            div.innerHTML = `
                <label for="${device.id}Hours"><i class="${device.icon}"></i> ${device.name}:</label>
                <input type="number" id="${device.id}Hours" value="${device.defaultHours}" step="0.1" min="0">
                <span>saat</span>
                <input type="number" id="${device.id}Power" value="${device.defaultPower}" step="10" min="0">
                <span>Watt</span>
            `;
            deviceInputsDiv.appendChild(div);

            const hoursInput = document.getElementById(`${device.id}Hours`);
            const powerInput = document.getElementById(`${device.id}Power`);
            
            // Kullanım süresini ve gücünü input'tan al veya varsayılanı kullan
            currentDeviceUsages[device.id] = parseFloat(hoursInput.value) || 0;
            currentDevicePowers[device.id] = parseFloat(powerInput.value) || device.defaultPower;
            
            hoursInput.addEventListener('input', () => {
                currentDeviceUsages[device.id] = parseFloat(hoursInput.value) || 0;
                calculateConsumption();
            });
            powerInput.addEventListener('input', () => {
                currentDevicePowers[device.id] = parseFloat(powerInput.value) || 0;
                calculateConsumption();
            });
        });
    }

    // Tasarruf senaryoları checkbox'larını HTML'e ekler
    function renderScenarioCheckboxes() {
        scenarioCheckboxesDiv.innerHTML = '';
        scenarios.forEach(scenario => {
            const div = document.createElement('div');
            div.classList.add('scenario-checkbox');
            div.innerHTML = `
                <input type="checkbox" id="${scenario.id}">
                <label for="${scenario.id}"><i class="${scenario.icon}"></i> ${scenario.name}</label>
            `;
            scenarioCheckboxesDiv.appendChild(div);

            document.getElementById(scenario.id).addEventListener('change', calculateConsumption);
        });
    }

    // Kademeli tarife üzerinden maliyeti hesaplar
    function calculateCost(monthlyKwh) {
        let cost = 0;
        let remainingKwh = monthlyKwh;

        // İlk kademe
        if (remainingKwh > KWH_LIMIT_1ST_STEP) {
            cost += KWH_LIMIT_1ST_STEP * KWH_PRICE_1ST_STEP_GROSS;
            remainingKwh -= KWH_LIMIT_1ST_STEP;
        } else {
            cost += remainingKwh * KWH_PRICE_1ST_STEP_GROSS;
            remainingKwh = 0;
        }

        // İkinci kademe
        if (remainingKwh > 0) {
            cost += remainingKwh * KWH_PRICE_2ND_STEP_GROSS;
        }
        return cost;
    }

    // --- Ana Hesaplama Fonksiyonu ---
    function calculateConsumption() {
        let totalDailyKwh = 0;
        let potentialSavingsDailyKwh = 0;

        // Mevcut günlük tüketimi hesapla
        devices.forEach(device => {
            let usageHours = currentDeviceUsages[device.id] || 0;
            let devicePower = currentDevicePowers[device.id];
            
            // Kullanıcı güç değeri girmediyse veya 0 ise varsayılanı kullan
            if (isNaN(devicePower) || devicePower <= 0) {
                const defaultDev = devices.find(d => d.id === device.id);
                devicePower = defaultDev ? defaultDev.defaultPower : 0;
            }

            if (device.type === 'alwaysOn') {
                usageHours = 24; // Buzdolabı gibi sürekli çalışanlar için
            }
            
            // Gizli cihazlar ana tüketim hesaplamasına dahil edilmez, sadece senaryolar için kullanılır
            if (device.type !== 'hidden') {
                let deviceKwh = (devicePower * usageHours) / 1000; // Wh'tan kWh'e çevir
                totalDailyKwh += deviceKwh;
            }
        });

        // Senaryoların potansiyel tasarruf etkisini hesapla
        scenarios.forEach(scenario => {
            const isChecked = document.getElementById(scenario.id).checked;
            if (isChecked) {
                if (scenario.type === 'hours') {
                    // Cihazın kullanım süresini azaltma senaryosu
                    const device = devices.find(d => d.id === scenario.deviceId);
                    if (device) {
                        const currentHours = currentDeviceUsages[device.id] || 0;
                        const devicePower = currentDevicePowers[device.id];
                        const powerToUse = (isNaN(devicePower) || devicePower <= 0) ? device.defaultPower : devicePower; // Gücü belirle
                        const reductionHours = Math.min(currentHours, scenario.reduction); // Negatif kullanım olmasın
                        potentialSavingsDailyKwh += (powerToUse * reductionHours) / 1000;
                    }
                } else if (scenario.type === 'percentage_reduction') {
                    // Cihazın mevcut tüketiminden yüzde bazında tasarruf
                    const device = devices.find(d => d.id === scenario.deviceId);
                     if (device) {
                        const currentHours = currentDeviceUsages[device.id] || 0;
                        const devicePower = currentDevicePowers[device.id];
                        const powerToUse = (isNaN(devicePower) || devicePower <= 0) ? device.defaultPower : devicePower;
                        const currentDeviceDailyKwh = (powerToUse * currentHours) / 1000;
                        potentialSavingsDailyKwh += (currentDeviceDailyKwh * scenario.reductionPercentage);
                    }
                }
                else if (scenario.type === 'switch_bulb') {
                    // Ampul değiştirme senaryosu (eski ampulleri LED'e çevirme)
                    const oldBulbPower = currentDevicePowers[scenario.oldBulbDeviceId];
                    const ledBulbPower = currentDevicePowers[scenario.ledBulbDeviceId];
                    
                    const actualOldBulbPower = (isNaN(oldBulbPower) || oldBulbPower <= 0) ? devices.find(d => d.id === scenario.oldBulbDeviceId).defaultPower : oldBulbPower;
                    const actualLedBulbPower = (isNaN(ledBulbPower) || ledBulbPower <= 0) ? devices.find(d => d.id === scenario.ledBulbDeviceId).defaultPower : ledBulbPower;

                    const numberOfBulbs = scenario.numberOfBulbs;
                    const bulbHours = scenario.bulbHours; 

                    const oldBulbsDailyKwh = (numberOfBulbs * actualOldBulbPower * bulbHours) / 1000;
                    const ledBulbsDailyKwh = (numberOfBulbs * actualLedBulbPower * bulbHours) / 1000;
                    
                    potentialSavingsDailyKwh += (oldBulbsDailyKwh - ledBulbsDailyKwh);
                } else if (scenario.type === 'fixed_kwh_reduction') {
                    // Sabit kWh tasarrufu (örn: standby cihazlar, termostat ayarı)
                    potentialSavingsDailyKwh += scenario.kwhReduction;
                }
            }
        });

        // Nihai tüketim ve maliyet hesaplamaları
        const finalDailyKwh = Math.max(0, totalDailyKwh - potentialSavingsDailyKwh); // Negatif tüketim olmasın

        const totalMonthlyKwh = totalDailyKwh * 30;
        const finalMonthlyKwh = finalDailyKwh * 30;

        const totalMonthlyCost = calculateCost(totalMonthlyKwh);
        const finalMonthlyCost = calculateCost(finalMonthlyKwh);
        const actualSavingsCost = totalMonthlyCost - finalMonthlyCost;


        // HTML elemanlarını güncelle (Sayı animasyonları ile)
        // Mevcut değerleri alıp hedef değerlere animasyon yap
        const currentKwhTarget = totalDailyKwh;
        const currentCostTarget = (totalMonthlyCost / 30);
        const monthlyKwhTarget = totalMonthlyKwh;
        const monthlyCostTarget = totalMonthlyCost;
        const savingsKwhTarget = potentialSavingsDailyKwh;
        const savingsCostTarget = actualSavingsCost;

        animateNumber(currentKwhSpan, parseFloat(currentKwhSpan.dataset.target), currentKwhTarget, 500, '', ' kWh');
        currentKwhSpan.dataset.target = currentKwhTarget;

        animateNumber(currentCostSpan, parseFloat(currentCostSpan.dataset.target), currentCostTarget, 500, '', ' TL');
        currentCostSpan.dataset.target = currentCostTarget;
        
        animateNumber(monthlyKwhSpan, parseFloat(monthlyKwhSpan.dataset.target), monthlyKwhTarget, 500, '', ' kWh');
        monthlyKwhSpan.dataset.target = monthlyKwhTarget;

        animateNumber(monthlyCostSpan, parseFloat(monthlyCostSpan.dataset.target), monthlyCostTarget, 500, '', ' TL');
        monthlyCostSpan.dataset.target = monthlyCostTarget;

        animateNumber(savingsKwhSpan, parseFloat(savingsKwhSpan.dataset.target), savingsKwhTarget, 500, '', ' kWh');
        savingsKwhSpan.dataset.target = savingsKwhTarget;

        animateNumber(savingsCostSpan, parseFloat(savingsCostSpan.dataset.target), savingsCostTarget, 500, '', ' TL');
        savingsCostSpan.dataset.target = savingsCostTarget;
    }

    // --- Olay Dinleyicileri ve Başlangıç Yüklemeleri ---
    renderDeviceInputs(); // Sayfa yüklendiğinde alet girişlerini oluştur
    renderScenarioCheckboxes(); // Sayfa yüklendiğinde senaryo checkbox'larını oluştur
    calculateConsumption(); // Sayfa yüklendiğinde ilk hesaplamayı yap

    // Sayfa yüklendiğinde kartlar için fade-in animasyonu (CSS ile senkronize)
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        // CSS animasyon gecikmesini buradan kontrol ettiğimiz için, JS'e gerek yok.
        // Ancak CSS'deki 'animation-delay' çalışmıyorsa bu kod kullanılabilir.
        // card.style.animationDelay = `${index * 0.15 + 0.2}s`;
        // card.style.opacity = '1';
        // card.style.transform = 'translateY(0)';
    });
}); // DOMContentLoaded olay dinleyicisini kapatan parantez. Bu en sonda olmalı.