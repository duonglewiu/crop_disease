-- Bảng lưu trữ phác đồ điều trị tĩnh phục vụ chạy Ngoại tuyến (Offline Mode - Checkpoint 3)
CREATE TABLE IF NOT EXISTS DiseaseTreatments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_name TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    vietnamese_name TEXT,
    pathogen_type TEXT, -- Fungi, Bacteria, Virus, Oomycete, Healthy
    severity_level TEXT, -- Nhẹ, Trung bình, Nghiêm trọng, Khỏe mạnh
    immediate_actions TEXT,
    chemical_treatment TEXT,
    biological_treatment TEXT,
    preventive_measures TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM DiseaseTreatments;

INSERT INTO DiseaseTreatments (
    crop_name, disease_name, vietnamese_name, pathogen_type, severity_level, 
    immediate_actions, chemical_treatment, biological_treatment, preventive_measures
) VALUES 
(
    'Tomato', 
    'Tomato___Late_blight', 
    'Bệnh mốc sương cà chua (Phytophthora infestans)', 
    'Oomycete', 
    'Nghiêm trọng',
    'Tỉa bỏ ngay các lá và chùm quả nhiễm bệnh đem tiêu hủy xa vườn; ngừng bón phân đạm; tuyệt đối không tưới phun mưa vào chiều tối.',
    'Phun luân phiên Metalaxyl-M + Mancozeb (Ridomil Gold 68WG, liều 50g/16L) hoặc Cymoxanil + Famoxadone. Thời gian cách ly (PHI): 7 ngày.',
    'Phun chế phẩm nấm đối kháng Trichoderma asperellum (10^8 bào tử/g) kết hợp vi khuẩn Bacillus subtilis định kỳ 7 ngày/lần.',
    'Chọn giống kháng bệnh, trồng mật độ thông thoáng, phủ màng nilon mặt luống và thoát nước rãnh triệt để khi mưa.'
),
(
    'Tomato', 
    'Tomato___Early_blight', 
    'Bệnh đốm vòng cà chua (Alternaria solani)', 
    'Fungi', 
    'Trung bình',
    'Cắt tỉa toàn bộ lá già sát mặt đất bị đốm vòng đồng tâm; vệ sinh tàn dư thực vật quanh gốc.',
    'Phun thuốc gốc Azoxystrobin + Difenoconazole (Amistar Top 325SC, liều 15ml/16L) hoặc Chlorothalonil 75WP. Thời gian cách ly: 7-10 ngày.',
    'Sử dụng dịch chiết tỏi 2% hoặc tinh dầu neem (Azadirachtin 0.3%) kết hợp nấm Chaetomium cupreum.',
    'Luân canh 2-3 năm với cây không cùng họ Cà, bón tăng cường Kali và Canxi giúp vách tế bào lá cứng cáp.'
),
(
    'Tomato', 
    'Tomato___Bacterial_spot', 
    'Bệnh đốm vi khuẩn cà chua (Xanthomonas campestris)', 
    'Bacteria', 
    'Trung bình',
    'Ngừng tưới phun mưa để tránh nước bắn lây lan vi khuẩn từ lá bệnh sang lá lành; khử trùng kéo cắt tỉa bằng cồn 70 độ.',
    'Phun thuốc gốc Đồng (Copper Hydroxide 77WP - Kocide, liều 30g/16L) kết hợp Kasugamycin 2L. Thời gian cách ly: 7 ngày.',
    'Phun vi khuẩn đối kháng Bacillus amyloliquefaciens hoặc xạ khuẩn Streptomyces lydicus.',
    'Xử lý hạt giống bằng nước ấm 50°C trong 25 phút trước khi gieo; không làm việc trong vườn khi tán lá còn ướt sương.'
),
(
    'Potato', 
    'Potato___Late_blight', 
    'Bệnh mốc sương khoai tây (Phytophthora infestans)', 
    'Oomycete', 
    'Nghiêm trọng',
    'Thu gom toàn bộ thân lá bị thối đen đem đốt hoặc chôn sâu với vôi bột; vun cao luống tránh bào tử rửa trôi xuống củ.',
    'Phun dập dịch bằng Dimethomorph + Mancozeb (Acrobat MZ, liều 40g/16L) hoặc Fluopicolide + Propamocarb. Thời gian cách ly: 14 ngày.',
    'Tưới gốc và phun lá bằng chế phẩm Trichoderma viride kết hợp Pseudomonas fluorescens.',
    'Sử dụng củ giống sạch bệnh được chứng nhận; cắt bỏ thân lá trước khi thu hoạch 10-14 ngày để vỏ củ hóa bần.'
),
(
    'Potato', 
    'Potato___Early_blight', 
    'Bệnh đốm vòng khoai tây (Alternaria solani)', 
    'Fungi', 
    'Nhẹ',
    'Tỉa bỏ các lá tầng dưới có vết đốm nâu đồng tâm; bổ sung phân bón lá giàu Kali và vi lượng.',
    'Phun Difenoconazole 250EC (Score 250EC, liều 10ml/16L) hoặc Mancozeb 80WP khi vết bệnh chớm xuất hiện. Thời gian cách ly: 7 ngày.',
    'Phun chế phẩm sinh học Bacillus subtilis và dịch chiết thảo mộc.',
    'Bón phân cân đối N-P-K, tránh để cây suy kiệt dinh dưỡng vào giai đoạn phình củ.'
),
(
    'Corn', 
    'Corn___Common_rust', 
    'Bệnh gỉ sắt ngô (Puccinia sorghi)', 
    'Fungi', 
    'Trung bình',
    'Bẻ bỏ các lá chân có nhiều ổ bào tử hạ màu nâu đỏ để giảm mật độ phát tán theo gió.',
    'Phun Propiconazole 250EC (Tilt Super 300EC, liều 15ml/16L) hoặc Tebuconazole khi tỷ lệ bệnh vượt 15%. Thời gian cách ly: 14 ngày.',
    'Sử dụng nấm đối kháng Trichoderma harzianum phun ức chế sự nảy mầm của bào tử gỉ sắt.',
    'Gieo trồng các giống ngô lai kháng gỉ sắt, bố trí thời vụ tránh giai đoạn trỗ cờ trùng với thời tiết lạnh ẩm kéo dài.'
),
(
    'Corn', 
    'Corn___Northern_Leaf_Blight', 
    'Bệnh cháy lá lớn ngô (Exserohilum turcicum)', 
    'Fungi', 
    'Nghiêm trọng',
    'Tỉa bỏ lá bị vết cháy hình thoi dài màu xám xanh ở tầng dưới; thông thoáng rãnh thoát nước.',
    'Phun Azoxystrobin + Propiconazole hoặc Carbendazim theo liều khuyến cáo. Thời gian cách ly: 14 ngày.',
    'Bón bổ sung chế phẩm vi sinh phân giải rơm rạ để diệt nguồn nấm tồn lưu trong tàn dư vụ trước.',
    'Cày vùi sâu tàn dư cây ngô sau thu hoạch, luân canh với cây đậu tương hoặc lạc.'
),
(
    'Corn', 
    'Corn___Cercospora_leaf_spot', 
    'Bệnh đốm lá xám ngô (Cercospora zeae-maydis)', 
    'Fungi', 
    'Trung bình',
    'Vệ sinh lá bệnh phía dưới gốc, giảm mật độ cỏ dại hành lang ruộng ngô.',
    'Phun Pyraclostrobin hoặc Trifloxystrobin + Tebuconazole (Nativo 750WG, liều 10g/16L). Thời gian cách ly: 14 ngày.',
    'Phun chế phẩm Bacillus megaterium kết hợp phân hữu cơ sinh học.',
    'Luân canh cây trồng tối thiểu 1 năm và chọn giống có gen kháng bệnh đốm lá xám.'
),
(
    'Apple', 
    'Apple___Apple_scab', 
    'Bệnh ghẻ hại táo (Venturia inaequalis)', 
    'Fungi', 
    'Trung bình',
    'Cắt tỉa cành vượt, thu gom lá rụng dưới gốc đem tiêu hủy để diệt nguồn bào tử túi qua đông.',
    'Phun Captan 80WG hoặc Myclobutanil / Difenoconazole vào giai đoạn nụ hồng và sau khi rụng cánh hoa. Thời gian cách ly: 14 ngày.',
    'Phun dung dịch 유황 (Lưu huỳnh vôi) hoặc Bacillus subtilis chủng QST 713.',
    'Tỉa tán thông thoáng đón nắng sớm, phun urê 5% lên lá rụng mùa thu để thúc đẩy phân hủy tàn dư nấm.'
),
(
    'Apple', 
    'Apple___Black_rot', 
    'Bệnh thối đen táo (Botryosphaeria obtusa)', 
    'Fungi', 
    'Nghiêm trọng',
    'Cắt bỏ các cành khô mục, hái bỏ toàn bộ quả khô xác (mummies) còn treo trên cây.',
    'Phun Thiophanate-methyl hoặc Captan kết hợp Mancozeb. Thời gian cách ly: 14 ngày.',
    'Quét vôi Bordeaux lên vết cắt cành lớn và phun nấm đối kháng Trichoderma.',
    'Tránh gây vết thương cơ giới trên vỏ cây và quả trong quá trình chăm sóc.'
),
(
    'Apple', 
    'Apple___Cedar_apple_rust', 
    'Bệnh gỉ sắt táo - tùng (Gymnosporangium juniperi-virginianae)', 
    'Fungi', 
    'Nhẹ',
    'Tỉa bỏ các lá có đốm vàng cam sáng; loại bỏ cây ký chủ phụ (họ Tùng Bách) trong bán kính 300m quanh vườn.',
    'Phun Myclobutanil hoặc Triadimefon định kỳ 7-10 ngày vào đầu mùa xuân. Thời gian cách ly: 14 ngày.',
    'Phun chế phẩm đồng hữu cơ kết hợp vi sinh vật đối kháng.',
    'Trồng các giống táo kháng bệnh gỉ sắt và kiểm tra mặt dưới lá thường xuyên.'
),
(
    'Grape', 
    'Grape___Black_rot', 
    'Bệnh thối đen nho (Guignardia bidwellii)', 
    'Fungi', 
    'Nghiêm trọng',
    'Cắt bỏ ngay các chùm nho bị nhăn nheo hóa đen và lá có đốm nâu viền đen; làm thông thoáng giàn nho.',
    'Phun Mancozeb hoặc Myclobutanil / Tebuconazole từ khi chồi mới dài 10cm đến khi quả bắt đầu chuyển màu. Thời gian cách ly: 14 ngày.',
    'Phun Bacillus subtilis kết hợp Kali Bicarbonate (KHCO3 0.5%) để ức chế bào tử nấm.',
    'Buộc cành trên giàn cao, tỉa lá che khuất chùm quả để ánh nắng và gió làm khô sương nhanh.'
),
(
    'Grape', 
    'Grape___Esca', 
    'Bệnh sởi đen / khô vằn thân nho (Phaeomoniella chlamydospora)', 
    'Fungi', 
    'Nghiêm trọng',
    'Đánh dấu cây bệnh, cắt bỏ phần thân gỗ bị hoại tử nâu đen lùi xuống phần mô khỏe ít nhất 15cm; khử trùng cưa cắt.',
    'Bôi keo bảo vệ vết cắt có chứa Tebuconazole hoặc Thiophanate-methyl ngay sau khi tỉa cành mùa đông.',
    'Bổ sung nấm Trichoderma atroviride chủng SC1 vào vết cắt tỉa để chiếm chỗ ngăn nấm gây bệnh xâm nhập.',
    'Không cắt tỉa cành nho vào những ngày mưa ẩm; đốt bỏ toàn bộ thân gỗ già nhiễm bệnh.'
),
(
    'Grape', 
    'Grape___Leaf_blight', 
    'Bệnh cháy lá nho (Pseudocercospora vitis)', 
    'Fungi', 
    'Trung bình',
    'Thu gom lá già bị cháy khô ở tầng dưới, giữ thông thoáng mặt đất dưới giàn.',
    'Phun thuốc gốc Đồng (Bordeaux 1%) hoặc Azoxystrobin + Difenoconazole. Thời gian cách ly: 10 ngày.',
    'Phun chế phẩm nấm đối kháng Chaetomium và Trichoderma.',
    'Bón phân hữu cơ hoai mục, thoát nước tốt và tránh tưới thừa đạm.'
),
(
    'Pepper', 
    'Pepper___Bacterial_spot', 
    'Bệnh đốm vi khuẩn ớt (Xanthomonas euvesicatoria)', 
    'Bacteria', 
    'Trung bình',
    'Tỉa bỏ lá bị đốm nâu sũng nước và rụng sớm; ngừng tưới phun mưa.',
    'Phun Copper Hydroxide kết hợp Mancozeb hoặc Kasugamycin. Thời gian cách ly: 7 ngày.',
    'Phun Bacillus subtilis và dịch chiết tỏi ớt sinh học.',
    'Luân canh với cây họ Hòa thảo, sử dụng màng phủ nông nghiệp ngăn bùn đất bắn lên lá.'
),
(
    'Healthy', 
    'Healthy', 
    'Cây trồng khỏe mạnh (Không phát hiện dấu hiệu bệnh lý)', 
    'Healthy', 
    'Khỏe mạnh',
    'Phiến lá xanh tốt, quang hợp bình thường. Tiếp tục duy trì chế độ tưới nước và dinh dưỡng hiện tại.',
    'Không sử dụng thuốc bảo vệ thực vật hóa học khi cây khỏe mạnh để bảo vệ thiên địch và môi trường.',
    'Có thể phun định kỳ phân bón lá sinh học, dịch trùng quế hoặc nấm Trichoderma ủ gốc 1 tháng/lần để tăng đề kháng.',
    'Thăm đồng định kỳ 3-5 ngày/lần, giữ vệ sinh đồng ruộng và theo dõi dự báo thời tiết.'
);
