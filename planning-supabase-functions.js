/* =========================================================
    UPLOAD PREVIEW KE SUPABASE
    Tambahkan fungsi ini ke lembur.js
    ========================================================= */

async function uploadPreviewKeSupabase(idPlanning, blob) {
    if (!supabaseClient) {
        showPlanningToast("error", "Upload gagal", "Koneksi database belum tersedia.");
        return null;
    }

    const safeName = String(idPlanning).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = "previews/" + safeName + "_" + Date.now() + ".png";

    try {
        var { error: uploadError } = await supabaseClient.storage
            .from("planning-preview")
            .upload(filePath, blob, { 
                upsert: true, 
                contentType: "image/png" 
            });

        if (uploadError) throw uploadError;

        var { data: publicData } = supabaseClient.storage
            .from("planning-preview")
            .getPublicUrl(filePath);

        var previewUrl = publicData.publicUrl;

        var { error: updateError } = await supabaseClient
            .from("planning_lembur")
            .update({ preview_url: previewUrl })
            .eq("kode_planning", idPlanning);

        if (updateError) throw updateError;

        var planningItem = findPlanningById(idPlanning);
        if (planningItem) {
            planningItem.previewUrl = previewUrl;
        }

        return previewUrl;
    } catch (error) {
        console.error("Gagal upload preview:", error);
        showPlanningToast("error", "Upload preview gagal", error.message || "Gagal menyimpan preview ke database.");
        return null;
    }
}

/* =========================================================
    HAPUS PREVIEW DARI SUPABASE
    ========================================================= */

async function hapusPreviewDariSupabase(idPlanning) {
    var planningItem = findPlanningById(idPlanning);
    var previewUrl = planningItem ? planningItem.previewUrl || "" : "";

    if (supabaseClient && previewUrl) {
        var marker = "/storage/v1/object/public/planning-preview/";
        var markerIndex = previewUrl.indexOf(marker);
        if (markerIndex !== -1) {
            var filePath = decodeURIComponent(previewUrl.slice(markerIndex + marker.length));
            var { error: storageError } = await supabaseClient.storage
                .from("planning-preview").remove([filePath]);
            if (storageError) {
                console.warn("Gagal hapus file preview:", storageError);
            }
        }

        var { error } = await supabaseClient.from("planning_lembur")
            .update({ preview_url: null })
            .eq("kode_planning", idPlanning);
        
        if (error) {
            console.warn("Gagal update preview_url:", error);
        }

        if (planningItem) {
            planningItem.previewUrl = "";
        }
    }
}

/* =========================================================
    SIMPAN PREVIEW KE SUPABASE
    Generate dan simpan preview ke Supabase
    ========================================================= */

async function simpanPreviewKeSupabase(idPlanning) {
    if (planningCRUDLoading) {
        return;
    }

    const item = findPlanningById(idPlanning);

    if (!item) {
        alert("Data planning tidak ditemukan.");
        return;
    }

    if (typeof html2canvas === "undefined") {
        alert("html2canvas belum termuat.");
        return;
    }

    planningCRUDLoading = true;

    try {
        showPlanningLoading("Menyimpan preview ke database...");
    } catch (e) {}

    let exportContainer = null;
    let objectURL = null;

    try {
        await new Promise(function(resolve) {
            requestAnimationFrame(function() {
                requestAnimationFrame(resolve);
            });
        });

        // Data planning
        const id = getPlanningId(item) || idPlanning || "-";
        const tanggal = item.tanggal || "-";
        const tanggalTampil = typeof formatTanggalPlanning === "function"
            ? formatTanggalPlanning(tanggal)
            : tanggal;
        const jamMulai = item.jamMulai || item.jam_mulai || "-";
        const jamSelesai = item.jamSelesai || item.jam_selesai || "-";

        let durasi = item.durasi || item.durasiLembur || null;
        if (!durasi && item.durasiMenit !== undefined && item.durasiMenit !== null) {
            if (typeof formatDurasiPlanning === "function") {
                durasi = formatDurasiPlanning(item.durasiMenit);
            } else {
                durasi = item.durasiMenit;
            }
        }
        durasi = durasi || "-";

        const jenisLemburValue = item.jenisLembur || item.jenis_lembur || "harian";
        const jenisLemburTampil = jenisLemburValue === "tanggal_merah" ? "Tanggal Merah" : "Harian";
        const keterangan = item.keterangan || item.keteranganLembur || item.catatan || "-";

        function escapeHTML(value) {
            if (value === null || value === undefined) return "";
            return String(value)
                .replace(/&/g, "&")
                .replace(/</g, "<")
                .replace(/>/g, ">")
                .replace(/"/g, """)
                .replace(/'/g, "&#039;");
        }

        // Get karyawan data
        const masterKaryawan = Array.isArray(window.karyawanData) ? window.karyawanData : [];

        function getKaryawanKey(data) {
            if (data === null || data === undefined) return null;
            if (typeof data !== "object") return String(data).trim();
            const keys = ["idKaryawan", "id_karyawan", "employeeId", "employee_id", "employeeID", "id", "ID", "nik", "NIK", "nip", "NIP"];
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
                    return String(data[key]).trim();
                }
            }
            return null;
        }

        function findMasterKaryawan(data) {
            const key = getKaryawanKey(data);
            if (key === null || key === "") return null;
            return masterKaryawan.find(function(karyawan) {
                const masterKey = getKaryawanKey(karyawan);
                if (masterKey === null) return false;
                return String(masterKey).trim().toLowerCase() === String(key).trim().toLowerCase();
            }) || null;
        }

        let daftarKaryawan = [];
        if (Array.isArray(item.karyawan)) {
            daftarKaryawan = item.karyawan.slice();
        }

        const karyawanFinal = daftarKaryawan.map(function(dataKaryawan) {
            let data = dataKaryawan;
            const master = findMasterKaryawan(data);
            if (master && typeof data === "object") {
                data = { ...master, ...data };
            } else if (master) {
                data = master;
            }

            if (data === null || data === undefined) return { nama: "-", nik: "-" };
            if (typeof data !== "object") {
                const masterData = findMasterKaryawan(data);
                if (masterData) { data = masterData; }
                else { return { nama: String(data), nik: String(data) }; }
            }

            const nama = data.nama || data.namaKaryawan || data.nama_lengkap || data.name || data.fullName || data.employeeName || data.karyawanNama || data.karyawan_nama || "-";
            const nik = data.nik || data.NIK || data.nikKaryawan || data.NIKKaryawan || data.nik_karyawan || data.nip || data.NIP || data.nomorNik || data.noNik || data.no_nik || data.nomorKaryawan || data.nomor_karyawan || data.idKaryawan || data.id_karyawan || data.employeeId || data.employee_id || data.employeeID || data.id || data.ID || "-";

            return { nama: String(nama).trim(), nik: String(nik).trim() };
        });

        const dataKaryawan = karyawanFinal.filter(function(data) {
            return data.nama !== "-" || data.nik !== "-";
        });

        if (dataKaryawan.length === 0) {
            dataKaryawan.push({ nama: "Tidak ada data karyawan", nik: "-" });
        }

        const jumlahKaryawan = dataKaryawan.length;
        let rowPadding, employeeFontSize, headerPadding;

        if (jumlahKaryawan <= 5) { rowPadding = 14; employeeFontSize = 13; headerPadding = 12; }
        else if (jumlahKaryawan <= 10) { rowPadding = 12; employeeFontSize = 12.5; headerPadding = 11; }
        else if (jumlahKaryawan <= 15) { rowPadding = 10; employeeFontSize = 12; headerPadding = 10; }
        else if (jumlahKaryawan <= 22) { rowPadding = 8; employeeFontSize = 11; headerPadding = 9; }
        else if (jumlahKaryawan <= 30) { rowPadding = 7; employeeFontSize = 10; headerPadding = 8; }
        else { rowPadding = 5; employeeFontSize = 9; headerPadding = 7; }

        let employeeRows = "";
        dataKaryawan.forEach(function(dataKaryawan, index) {
            employeeRows += `
                <tr>
                    <td style="width:55px;padding:${rowPadding}px 6px;text-align:center;background:#f5f5f5;color:#202020;border:1px solid #d7d7d7;font-family:Arial,Helvetica,sans-serif;font-size:${employeeFontSize}px;font-weight:400;vertical-align:middle;box-sizing:border-box;line-height:1.35;">
                        ${index + 1}
                    </td>
                    <td style="width:350px;padding:${rowPadding}px 14px;text-align:left;background:#ffffff;color:#202020;border:1px solid #d7d7d7;font-family:Arial,Helvetica,sans-serif;font-size:${employeeFontSize}px;font-weight:400;vertical-align:middle;box-sizing:border-box;line-height:1.35;letter-spacing:.1px;white-space:normal;overflow-wrap:anywhere;">
                        ${escapeHTML(dataKaryawan.nama)}
                    </td>
                    <td style="width:255px;padding:${rowPadding}px 14px;text-align:left;background:#f5f5f5;color:#202020;border:1px solid #d7d7d7;font-family:Arial,Helvetica,sans-serif;font-size:${employeeFontSize}px;font-weight:400;vertical-align:middle;box-sizing:border-box;line-height:1.35;letter-spacing:.1px;white-space:normal;overflow-wrap:anywhere;">
                        ${escapeHTML(dataKaryawan.nik)}
                    </td>
                </tr>
            `;
        });

        // Create export container
        exportContainer = document.createElement("div");
        exportContainer.style.position = "fixed";
        exportContainer.style.left = "-100000px";
        exportContainer.style.top = "0";
        exportContainer.style.width = "794px";
        exportContainer.style.height = "auto";
        exportContainer.style.overflow = "visible";
        exportContainer.style.background = "#ffffff";
        exportContainer.style.margin = "0";
        exportContainer.style.padding = "0";
        exportContainer.style.boxSizing = "border-box";

        exportContainer.innerHTML = `
            <div style="position:relative;width:794px;min-height:1123px;height:auto;overflow:visible;background:#ffffff;color:#202020;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
                <div style="width:794px;height:112px;background:rgb(247,244,15);display:flex;align-items:center;padding:0 55px;box-sizing:border-box;">
                    <div style="width:92px;height:60px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:20px;">
                        <img class="linfox-export-logo" src="Logo.png" crossorigin="anonymous" style="max-width:92px;max-height:60px;width:auto;height:auto;object-fit:contain;display:block;">
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:20px;font-weight:800;line-height:1.1;white-space:nowrap;">PT LINFOX LOGISTICS INDONESIA</div>
                        <div style="font-size:9.5px;color:#555555;font-weight:600;margin-top:6px;letter-spacing:.2px;">LOGISTICS & SUPPLY CHAIN MANAGEMENT</div>
                    </div>
                    <div style="width:104px;height:54px;background:#202020;border-radius:8px;display:flex;flex-direction:column;justify-content:center;align-items:center;flex-shrink:0;">
                        <div style="color:rgb(247,244,15);font-size:10px;font-weight:800;letter-spacing:.5px;">DOKUMEN</div>
                        <div style="color:#ffffff;font-size:9px;margin-top:4px;font-weight:600;">LEMBUR</div>
                    </div>
                </div>
                <div style="width:660px;margin:0 auto;text-align:center;padding-top:24px;box-sizing:border-box;">
                    <div style="font-size:23px;font-weight:800;line-height:1.15;letter-spacing:.25px;">SURAT PERINTAH LEMBUR</div>
                    <div style="margin-top:7px;font-size:10px;color:#666666;font-weight:600;">Planning ID : ${escapeHTML(id)}</div>
                    <div style="width:72px;height:3px;background:rgb(247,244,15);margin:9px auto 0;border-radius:2px;"></div>
                </div>
                <div style="width:660px;margin:27px auto 0;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;margin-bottom:11px;">
                        <div style="width:6px;height:21px;background:rgb(247,244,15);border-radius:3px;margin-right:10px;flex-shrink:0;"></div>
                        <div style="font-size:15px;font-weight:800;letter-spacing:.15px;line-height:1.2;">INFORMASI LEMBUR</div>
                    </div>
                    <div style="width:660px;background:#f3f3f3;border:1px solid #d7d7d7;border-radius:9px;padding:0;overflow:hidden;box-sizing:border-box;">
                        <table style="width:660px;max-width:660px;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;margin:0;padding:0;box-sizing:border-box;">
                            <colgroup><col style="width:105px;"><col style="width:225px;"><col style="width:105px;"><col style="width:225px;"></colgroup>
                            <tr>
                                <td style="width:105px;height:44px;padding:11px 12px;background:#e5e5e5;color:#555555;border:1px solid #d2d2d2;font-weight:700;vertical-align:middle;box-sizing:border-box;white-space:nowrap;">ID Planning</td>
                                <td style="width:225px;height:44px;padding:11px 13px;background:#ffffff;color:#202020;border:1px solid #d2d2d2;font-weight:600;vertical-align:middle;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(id)}</td>
                                <td style="width:105px;height:44px;padding:11px 12px;background:#e5e5e5;color:#555555;border:1px solid #d2d2d2;font-weight:700;vertical-align:middle;box-sizing:border-box;white-space:nowrap;">Jam Selesai</td>
                                <td style="width:225px;height:44px;padding:11px 13px;background:#ffffff;color:#202020;border:1px solid #d2d2d2;font-weight:600;vertical-align:middle;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(jamSelesai)}</td>
                            </tr>
                            <tr>
                                <td style="width:105px;height:44px;padding:11px 12px;background:#e5e5e5;color:#555555;border:1px solid #d2d2d2;font-weight:700;vertical-align:middle;box-sizing:border-box;white-space:nowrap;">Tanggal</td>
                                <td style="width:225px;height:44px;padding:11px 13px;background:#ffffff;color:#202020;border:1px solid #d2d2d2;font-weight:600;vertical-align:middle;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(tanggalTampil)}</td>
                                <td style="width:105px;height:44px;padding:11px 12px;background:#e5e5e5;color:#555555;border:1px solid #d2d2d2;font-weight:700;vertical-align:middle;box-sizing:border-box;white-space:nowrap;">Durasi</td>
                                <td style="width:225px;height:44px;padding:11px 13px;background:#ffffff;color:#202020;border:1px solid #d2d2d2;font-weight:600;vertical-align:middle;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(durasi)}</td>
                            </tr>
                            <tr>
                                <td style="width:105px;height:44px;padding:11px 12px;background:#e5e5e5;color:#555555;border:1px solid #d2d2d2;font-weight:700;vertical-align:middle;box-sizing:border-box;white-space:nowrap;">Jam Mulai</td>
                                <td style="width:225px;height:44px;padding:11px 13px;background:#ffffff;color:#202020;border:1px solid #d2d2d2;font-weight:600;vertical-align:middle;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(jamMulai)}</td>
                                <td style="width:105px;height:44px;padding:11px 12px;background:#e5e5e5;color:#555555;border:1px solid #d2d2d2;font-weight:700;vertical-align:middle;box-sizing:border-box;white-space:nowrap;">Jenis Lembur</td>
                                <td style="width:225px;height:44px;padding:11px 13px;background:#ffffff;color:#202020;border:1px solid #d2d2d2;font-weight:600;vertical-align:middle;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere;line-height:1.35;">${escapeHTML(jenisLemburTampil)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div style="width:660px;margin:35px auto 0;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;margin-bottom:13px;">
                        <div style="width:7px;height:24px;background:rgb(247,244,15);border-radius:3px;margin-right:11px;flex-shrink:0;"></div>
                        <div style="font-size:17px;font-weight:800;letter-spacing:.15px;line-height:1.2;">DAFTAR KARYAWAN</div>
                    </div>
                    <div style="width:660px;border:1px solid #d7d7d7;border-radius:10px;overflow:hidden;box-sizing:border-box;">
                        <table style="width:660px;max-width:660px;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-family:Arial,Helvetica,sans-serif;font-size:${employeeFontSize}px;margin:0;padding:0;">
                            <colgroup><col style="width:55px;"><col style="width:350px;"><col style="width:255px;"></colgroup>
                            <thead>
                                <tr>
                                    <th style="width:55px;padding:${headerPadding}px 6px;background:#202020;color:rgb(247,244,15);border:1px solid #202020;text-align:center;font-size:${employeeFontSize}px;font-weight:800;box-sizing:border-box;line-height:1.3;">NO</th>
                                    <th style="width:350px;padding:${headerPadding}px 14px;background:#202020;color:rgb(247,244,15);border:1px solid #202020;text-align:left;font-size:${employeeFontSize}px;font-weight:800;box-sizing:border-box;line-height:1.3;">NAMA KARYAWAN</th>
                                    <th style="width:255px;padding:${headerPadding}px 14px;background:#202020;color:rgb(247,244,15);border:1px solid #202020;text-align:left;font-size:${employeeFontSize}px;font-weight:800;box-sizing:border-box;line-height:1.3;">NIK / ID</th>
                                </tr>
                            </thead>
                            <tbody>${employeeRows}</tbody>
                        </table>
                    </div>
                    <div style="width:660px;margin-top:14px;padding:14px 16px;background:#fffedc;border:1px solid rgb(247,244,15);border-radius:9px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;font-weight:700;line-height:1.35;box-sizing:border-box;">
                        TOTAL KARYAWAN : ${jumlahKaryawan} ORANG
                    </div>
                </div>
                <div style="width:660px;margin:31px auto 0;padding:16px 18px;background:#fafafa;border:1px solid #e1e1e1;border-radius:9px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#666666;line-height:1.55;">
                    <span style="font-weight:700;color:#333333;">Catatan:</span> Dokumen ini merupakan surat perintah lembur berdasarkan planning yang telah dibuat.
                </div>
                <div style="width:590px;margin:34px auto 0;display:flex;justify-content:space-between;text-align:center;box-sizing:border-box;">
                    <div style="width:190px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#666666;">
                        <div style="font-weight:600;margin-bottom:8px;">Mengetahui,</div>
                        <div style="height:52px;"></div>
                        <div style="border-bottom:1px solid #999999;width:100%;"></div>
                        <div style="margin-top:7px;font-size:10px;color:#888888;">Supervisor / Atasan</div>
                    </div>
                    <div style="width:190px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#666666;">
                        <div style="font-weight:600;margin-bottom:8px;">Dibuat oleh,</div>
                        <div style="height:52px;"></div>
                        <div style="border-bottom:1px solid #999999;width:100%;"></div>
                        <div style="margin-top:7px;font-size:10px;color:#888888;">PIC Planning</div>
                    </div>
                </div>
                <div style="position:absolute;left:67px;right:67px;bottom:17px;height:31px;border-top:2px solid rgb(247,244,15);display:flex;align-items:flex-end;justify-content:space-between;padding-top:8px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#888888;">
                    <span>Planning Lembur - ${escapeHTML(id)}</span>
                    <span>PT LINFOX LOGISTICS INDONESIA</span>
                </div>
            </div>
        `;

        document.body.appendChild(exportContainer);

        const logo = exportContainer.querySelector(".linfox-export-logo");
        if (logo) {
            await new Promise(function(resolve) {
                let selesai = false;
                function finish() {
                    if (selesai) return;
                    selesai = true;
                    resolve();
                }
                if (logo.complete) { finish(); return; }
                logo.onload = finish;
                logo.onerror = finish;
                setTimeout(finish, 2000);
            });
            if (!logo.naturalWidth) {
                logo.style.display = "none";
            }
        }

        const exportPage = exportContainer.firstElementChild;
        let exportHeight = 1123;
        if (exportPage) {
            exportPage.style.height = "auto";
            exportPage.style.minHeight = "1123px";
            exportPage.style.overflow = "visible";
            exportContainer.style.height = "auto";
            exportContainer.style.overflow = "visible";
            exportHeight = Math.max(1123, exportPage.scrollHeight);
            exportPage.style.height = exportHeight + "px";
            exportContainer.style.height = exportHeight + "px";
        }

        showPlanningLoading("Membuat gambar PNG...");

        await new Promise(function(resolve) {
            requestAnimationFrame(function() {
                requestAnimationFrame(resolve);
            });
        });

        let canvas = null;
        try {
            canvas = await html2canvas(exportContainer, {
                scale: 1.5,
                width: 794,
                height: exportHeight,
                windowWidth: 794,
                windowHeight: exportHeight,
                backgroundColor: "#ffffff",
                useCORS: true,
                allowTaint: false,
                imageTimeout: 5000,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                foreignObjectRendering: false,
                removeContainer: true
            });
        } catch (firstError) {
            console.warn("[PNG] Render pertama gagal:", firstError);
            if (logo) { logo.style.display = "none"; }
            canvas = await html2canvas(exportContainer, {
                scale: 1,
                width: 794,
                height: exportHeight,
                windowWidth: 794,
                windowHeight: exportHeight,
                backgroundColor: "#ffffff",
                useCORS: false,
                allowTaint: false,
                imageTimeout: 2000,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                foreignObjectRendering: false,
                removeContainer: true
            });
        }

        if (!canvas) {
            throw new Error("Canvas PNG gagal dibuat.");
        }

        showPlanningLoading("Menyimpan ke database...");

        const blob = await new Promise(function(resolve, reject) {
            try {
                canvas.toBlob(function(hasil) {
                    if (!hasil) { reject(new Error("PNG gagal dibuat.")); return; }
                    if (hasil.size <= 0) { reject(new Error("File PNG kosong.")); return; }
                    resolve(hasil);
                }, "image/png");
            } catch (e) {
                reject(e);
            }
        });

        // Upload to Supabase
        const previewUrl = await uploadPreviewKeSupabase(idPlanning, blob);

        if (previewUrl) {
            showPlanningToast("success", "Preview disimpan", "Preview berhasil disimpan ke database.");
        } else {
            showPlanningToast("warning", "Preview dibuat tapi gagal disimpan", "Preview berhasil dibuat tapi gagal disimpan ke database.");
        }

        // Also download the file
        objectURL = URL.createObjectURL(blob);
        const namaFile = String(idPlanning).replace(/[^a-zA-Z0-9_-]/g, "_");
        const downloadLink = document.createElement("a");
        downloadLink.style.position = "fixed";
        downloadLink.style.left = "-99999px";
        downloadLink.style.top = "0";
        downloadLink.style.width = "1px";
        downloadLink.style.height = "1px";
        downloadLink.style.opacity = "0";
        downloadLink.href = objectURL;
        downloadLink.download = "SPL_" + namaFile + ".png";
        document.body.appendChild(downloadLink);

        await new Promise(function(resolve) {
            requestAnimationFrame(function() {
                try { downloadLink.click(); } catch (e) { console.error("[PNG] Download error:", e); }
                setTimeout(resolve, 500);
            });
        });

        // Cleanup download link
        try { if (downloadLink && downloadLink.parentNode) { downloadLink.parentNode.removeChild(downloadLink); } } catch (e) {}
        try { if (objectURL) { URL.revokeObjectURL(objectURL); } } catch (e) {}

    } catch (error) {
        console.error("[SIMPAN PREVIEW] GAGAL:", error);
        showPlanningToast("error", "Gagal menyimpan preview", error && error.message ? error.message : "Terjadi kesalahan saat menyimpan preview.");
    } finally {
        try { if (exportContainer && exportContainer.parentNode) { exportContainer.parentNode.removeChild(exportContainer); } } catch (e) {}
        try { setTimeout(function() { try { hidePlanningLoading(); } catch (e) {} }, 300); } catch (e) {}
        planningCRUDLoading = false;
    }
}