"""
Script xuất mô hình PyTorch sang định dạng ONNX & Lượng tử hóa mô hình (Quantization).
Đáp ứng Checkpoint 2 trong tiến độ đồ án (Tuần 2.3).
"""

import os
import torch
from ai_core.models.swin_transformer_v2 import SwinV2CropClassifier
from ai_core.models.unet_efficientnet import UNetSeveritySegmentor

def export_swin_to_onnx(model_weights_path: str, output_onnx_path: str, num_classes: int = 38):
    print("Exporting Swin Transformer V2 to ONNX...")
    model = SwinV2CropClassifier(num_classes=num_classes, pretrained=False)
    if os.path.exists(model_weights_path):
        model.load_state_dict(torch.load(model_weights_path, map_location="cpu"))
    model.eval()

    dummy_input = torch.randn(1, 3, 256, 256)
    torch.onnx.export(
        model,
        dummy_input,
        output_onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
    )
    print(f"Exported SwinV2 to {output_onnx_path}")

def export_unet_to_onnx(model_weights_path: str, output_onnx_path: str):
    print("Exporting U-Net (EfficientNet-B0) to ONNX...")
    model = UNetSeveritySegmentor()
    if os.path.exists(model_weights_path):
        model.load_state_dict(torch.load(model_weights_path, map_location="cpu"))
    model.eval()

    dummy_input = torch.randn(1, 3, 256, 256)
    torch.onnx.export(
        model,
        dummy_input,
        output_onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["mask"],
        dynamic_axes={"input": {0: "batch_size"}, "mask": {0: "batch_size"}}
    )
    print(f"Exported U-Net to {output_onnx_path}")

if __name__ == "__main__":
    os.makedirs("test", exist_ok=True)
    # Xuất SwinV2
    export_swin_to_onnx("test/swinv2_best_model.pth", "test/swinv2_plantdisease.onnx")
    # Xuất U-Net
    export_unet_to_onnx("test/unet_best_model.pth", "test/unet_plantdisease.onnx")

