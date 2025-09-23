        function formatInput(input) {
            var val = input.value.replace(/\D/g, '');
            val = val.replace(/\./g, '');
            val = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            input.value = val;
        }

        function calculateGold() {
            var rate = parseFloat(document.getElementById("rate").value);
            var goldInput = document.getElementById("gold").value.replace(/\./g, '');
            var gold = parseFloat(goldInput);
            var tax = parseFloat(document.getElementById("tax").value);

            var formatNumber = (num) => {
                return num.toLocaleString('id-ID', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            }

            var hargaRate = formatNumber((rate * gold) / 1);
            var hargaPost = formatNumber(Math.round(gold / (1 - tax)));
            var hargaBersih = formatNumber(gold - (gold * tax));

            document.getElementById("hasil").innerHTML = "<strong>Harga sesuai Rate: </strong>Rp" + hargaRate;
            if (document.getElementById("bersih").checked) {
                document.getElementById("hasilGold").innerHTML = "<strong>Gold + Tax (Harga trade): </strong> " + hargaPost;
            } else {
                document.getElementById("hasilGold").innerHTML = "<strong>Gold Bersih didapat: </strong> " + hargaBersih;
            }
        }
