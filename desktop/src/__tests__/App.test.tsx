import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { DiagnoseE2EResponse } from '../types/diagnosis';

const MOCK_SUCCESS_RESPONSE: DiagnoseE2EResponse = {
  status: 'success',
  workflow_steps_completed: 10,
  inference_time_ms: 42.3,
  network_mode_requested: 'hybrid',
  active_treatment_source: 'Online FastAPI RAG + ChromaDB Vectorstore',
  blur_check: {
    is_blurry: false,
    laplacian_variance: 8603.76,
    threshold: 100,
    message: 'Độ sắc nét đạt chuẩn.',
  },
  classification: {
    raw_label: 'Potato___Late_blight',
    crop_name: 'Potato',
    disease_name: 'Late blight',
    disease_vi: 'Bệnh mốc sương khoai tây (Late Blight)',
    confidence: 0.948,
    tta_applied: true,
    user_crop_filter: 'Potato',
    top_predictions: [
      {
        label: 'Potato___Late_blight',
        crop_name: 'Potato',
        disease_name: 'Late blight',
        disease_vi: 'Bệnh mốc sương khoai tây (Late Blight)',
        confidence: 0.948,
      },
      {
        label: 'Potato___Early_blight',
        crop_name: 'Potato',
        disease_name: 'Early blight',
        disease_vi: 'Bệnh đốm vòng khoai tây (Early Blight)',
        confidence: 0.041,
      },
    ],
  },
  segmentation: {
    severity_percentage: 28.4,
    severity_level: 'Trung bình (15% - 40%)',
    lesion_pixels: 14210,
    total_pixels: 50035,
    mask_overlay_base64: 'data:image/png;base64,MOCK_UNET_OVERLAY',
  },
  offline_treatment: {
    found: true,
    source: 'Offline SQLite Database (disease_treatments.db)',
    crop_name: 'Potato',
    disease_name: 'Late blight',
    disease_vi: 'Bệnh mốc sương khoai tây (Phytophthora infestans)',
    severity_threshold: 15,
    chemical_treatment: 'Phun Metalaxyl-M + Mancozeb (Ridomil Gold 68WG) liều 50g/16L.',
    biological_treatment: 'Nấm đối kháng Trichoderma viride kết hợp Bacillus subtilis.',
    preventive_measures: 'Vun luống cao thoát nước, tiêu hủy tàn dư bệnh.',
    pre_harvest_interval_days: 7,
  },
  online_rag_treatment: {
    crop_name: 'Potato',
    disease_name: 'Late blight',
    severity_level: 'Trung bình (15% - 40%)',
    immediate_actions: [
      'Cắt tỉa ngay các lá nhiễm bệnh nặng.',
      'Ngưng tưới phun mưa lên tán lá.',
    ],
    chemical_treatments: [
      {
        active_ingredient: 'Metalaxyl-M + Mancozeb',
        product_name: 'Ridomil Gold 68WG',
        dosage: '50g / bình 16L',
        pre_harvest_interval_days: 14,
      },
    ],
    biological_treatments: [
      {
        method: 'Trichoderma spp.',
        description: 'Phun định kỳ 7 ngày/lần để ức chế bào tử nấm.',
      },
    ],
    prevention_guidelines: ['Luân canh khác họ Cà tối thiểu 2 vụ.'],
    source_documents: ['agricultural_guidelines.md (chunk #2)'],
  },
};

const MOCK_BLURRY_RESPONSE: DiagnoseE2EResponse = {
  status: 'rejected_blurry',
  workflow_steps_completed: 2,
  inference_time_ms: 4.1,
  network_mode_requested: 'hybrid',
  active_treatment_source: 'Rejected at Step 2 (Laplacian Blur Filter)',
  blur_check: {
    is_blurry: true,
    laplacian_variance: 0.0,
    threshold: 100,
    message: 'Ảnh bị mờ hoặc rung tay.',
  },
  classification: null,
  segmentation: null,
};

describe('AgroScan AI Redesigned UI/UX & E2E Flows', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hiển thị màn hình khởi đầu tối giản, ít chữ, không emoji và ẩn tùy chọn nâng cao mặc định', () => {
    const { container } = render(<App />);

    expect(
      screen.getByRole('heading', { name: /Kiểm tra sức khỏe lá cây trong vài giây/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Tự động nhận diện')).toBeInTheDocument();

    // Có sẵn 3 nút mẫu thử 1-Click gọn nhẹ
    expect(screen.getByRole('button', { name: 'Lá bệnh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ảnh mờ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lá khỏe' })).toBeInTheDocument();

    // Không hiển thị sẵn kết quả giả hay bảng thông số dài khi chưa quét
    expect(screen.queryByText(/Phác đồ điều trị khuyến nghị/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Ngưỡng lọc mờ/i)).not.toBeInTheDocument();

    // Tuân thủ anti-pattern UI/UX Pro Max: không dùng emoji làm icon UI
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
    expect(emojiRegex.test(container.textContent || '')).toBe(false);

    // Mở ngăn kéo Tùy chỉnh bằng 1 click (Progressive Disclosure)
    fireEvent.click(screen.getByRole('button', { name: /Mở tùy chỉnh nâng cao/i }));
    expect(screen.getByLabelText(/Ngưỡng lọc mờ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ghi chú thời tiết/i)).toBeInTheDocument();
  });

  it('thực hiện chẩn đoán chỉ với 1 lần nhấn mẫu thử và hiển thị đầy đủ kết quả + chi tiết mở rộng', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => MOCK_SUCCESS_RESPONSE,
    });

    render(<App />);

    // Chỉ cần 1 click nút "Lá bệnh"
    fireEvent.click(screen.getByRole('button', { name: 'Lá bệnh' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Kiểm tra payload FormData gửi lên /api/v1/diagnose
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/diagnose');
    const body = options.body as FormData;
    expect(body.get('crop_filter')).toBe('');
    expect(body.get('network_mode')).toBe('hybrid');
    expect(body.get('force_analyze')).toBe('false');

    // Chuyển sang màn hình kết quả gọn gàng
    expect(
      await screen.findByRole('heading', { name: /Bệnh mốc sương khoai tây/i })
    ).toBeInTheDocument();
    expect(screen.getByText('94.8%')).toBeInTheDocument();
    expect(screen.getAllByText('28.4%').length).toBeGreaterThan(0);
    expect(screen.getByAltText('Bản đồ phân đoạn vùng bệnh U-Net')).toBeInTheDocument();

    // Phác đồ RAG mặc định hiển thị rõ ràng
    expect(screen.getByText(/Ridomil Gold 68WG/i)).toBeInTheDocument();
    expect(screen.getByText(/Cách ly 14 ngày/i)).toBeInTheDocument();

    // Mở rộng Progressive Disclosure: Top-3 xác suất, Nguồn RAG, Tiến trình 10/10 bước
    fireEvent.click(screen.getByRole('button', { name: /Chi tiết mô hình AI/i }));
    expect(screen.getByText(/Bệnh đốm vòng khoai tây/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Nguồn trích dẫn Vector DB/i }));
    expect(screen.getByText(/agricultural_guidelines\.md/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Xem tiến trình 10 bước E2E/i }));
    expect(screen.getByText(/1\. Ảnh RGB/i)).toBeInTheDocument();
    expect(screen.getByText(/10\. UI Report/i)).toBeInTheDocument();
  });

  it('từ chối ảnh mờ ở bước 2 và hỗ trợ nút Vẫn tiếp tục phân tích', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_BLURRY_RESPONSE,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_SUCCESS_RESPONSE,
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh mờ' }));

    expect(
      await screen.findByText(/Ảnh chưa đủ độ nét để chẩn đoán/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Phác đồ điều trị khuyến nghị/i)).not.toBeInTheDocument();

    // Bấm "Vẫn tiếp tục phân tích" -> gửi force_analyze = true
    fireEvent.click(screen.getByRole('button', { name: /Vẫn tiếp tục phân tích/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const secondBody = fetchMock.mock.calls[1][1].body as FormData;
    expect(secondBody.get('force_analyze')).toBe('true');
    expect(
      await screen.findByRole('heading', { name: /Bệnh mốc sương khoai tây/i })
    ).toBeInTheDocument();
  });

  it('tự động chẩn đoán lại ngay khi đổi loài cây hoặc chuyển chế độ Offline và hỗ trợ Quét mới', async () => {
    const offlineResponse: DiagnoseE2EResponse = {
      ...MOCK_SUCCESS_RESPONSE,
      network_mode_requested: 'offline',
      active_treatment_source: 'Offline SQLite Database',
      online_rag_treatment: null,
    };

    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_SUCCESS_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_SUCCESS_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => offlineResponse });

    render(<App />);

    // Upload file trực tiếp vào input -> tự động chẩn đoán luôn
    const fileInput = document.getElementById('leaf-file-upload') as HTMLInputElement;
    const leafFile = new File(['leaf-bytes'], 'field_potato.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [leafFile] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Chọn loài cây "Khoai tây" -> tự động chạy lại với crop_filter=Potato
    fireEvent.click(screen.getByRole('button', { name: 'Khoai tây' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((fetchMock.mock.calls[1][1].body as FormData).get('crop_filter')).toBe('Potato');

    // Chuyển sang Offline -> tự động chạy lại với network_mode=offline và mở SQLite
    const offlineModeBtn = screen.getByRole('button', { name: 'Offline' });
    fireEvent.click(offlineModeBtn);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(offlineModeBtn).toHaveAttribute('aria-pressed', 'true');
    expect((fetchMock.mock.calls[2][1].body as FormData).get('network_mode')).toBe('offline');
    expect(await screen.findByText(/Cách ly 7 ngày/i)).toBeInTheDocument();

    // Bấm Quét mới -> quay lại trạng thái khởi đầu sạch sẽ
    fireEvent.click(screen.getByRole('button', { name: 'Quét mới' }));
    expect(
      await screen.findByRole('heading', { name: /Kiểm tra sức khỏe lá cây trong vài giây/i })
    ).toBeInTheDocument();
  });
});
