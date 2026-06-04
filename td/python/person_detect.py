"""
TouchDesigner (Spout) -> YOLO person detection -> OSC -> TouchDesigner
"""

import array
import argparse
from itertools import repeat
import cv2
import numpy as np
from ultralytics import YOLO
from pythonosc import udp_client
import SpoutGL
from OpenGL import GL

# =========================
# 設定
# =========================
SPOUT_SENDER_NAME = "TouchDesigner"   # TDのSpout送信者名

YOLO_MODEL = "yolo11s.pt"
YOLO_DEVICE = 0          # GPU: 0 / CPU: "cpu"
CONF_THRES = 0.35
IMG_SIZE = 640

OSC_HOST = "127.0.0.1"
OSC_PORT = 7000          # TDのOSC In CHOPのポートに合わせる

SHOW_PREVIEW = False


def send_detections(osc: udp_client.SimpleUDPClient, boxes: np.ndarray, frame_w: int, frame_h: int):
    """
    検出された人物のbboxをOSCでTDに送信。
    座標は 0.0〜1.0 に正規化。

    /person/count   i  <人数>
    /person/<i>/bbox  ffff  <x1 y1 x2 y2>  (正規化)
    /person/<i>/center  ff  <cx cy>         (正規化)
    """
    count = len(boxes)
    osc.send_message("/person/count", count)

    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = box.astype(float)
        nx1 = x1 / frame_w
        ny1 = y1 / frame_h
        nx2 = x2 / frame_w
        ny2 = y2 / frame_h
        cx = (nx1 + nx2) / 2
        cy = (ny1 + ny2) / 2

        osc.send_message(f"/person/{i}/bbox", [nx1, ny1, nx2, ny2])
        osc.send_message(f"/person/{i}/center", [cx, cy])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="OpenCVプレビューウィンドウを表示する")
    args = parser.parse_args()
    show_preview = args.preview or SHOW_PREVIEW

    model = YOLO(YOLO_MODEL)
    osc = udp_client.SimpleUDPClient(OSC_HOST, OSC_PORT)

    print(f"Waiting for Spout sender: '{SPOUT_SENDER_NAME}'")
    print(f"OSC -> {OSC_HOST}:{OSC_PORT}")

    with SpoutGL.SpoutReceiver() as receiver:
        receiver.setReceiverName(SPOUT_SENDER_NAME)

        buffer = None
        frame_w, frame_h = 0, 0

        while True:
            result = receiver.receiveImage(buffer, GL.GL_RGBA, False, 0)

            # サイズ変更 or 初回接続
            if receiver.isUpdated():
                frame_w = receiver.getSenderWidth()
                frame_h = receiver.getSenderHeight()
                buffer = array.array('B', repeat(0, frame_w * frame_h * 4))
                print(f"Connected: {SPOUT_SENDER_NAME} ({frame_w}x{frame_h})")

            if buffer and result and not SpoutGL.helpers.isBufferEmpty(buffer):
                frame = np.frombuffer(buffer, dtype=np.uint8).reshape((frame_h, frame_w, 4))
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)

                # YOLO person検出 (class 0 = person)
                results = model.predict(
                    frame_bgr,
                    classes=[0],
                    conf=CONF_THRES,
                    imgsz=IMG_SIZE,
                    device=YOLO_DEVICE,
                    verbose=False,
                )

                boxes = np.empty((0, 4), dtype=np.float32)
                if results and results[0].boxes is not None:
                    xyxy = results[0].boxes.xyxy
                    if xyxy is not None and len(xyxy) > 0:
                        boxes = xyxy.cpu().numpy()

                send_detections(osc, boxes, frame_w, frame_h)

                if show_preview:
                    display = frame_bgr.copy()
                    for box in boxes:
                        x1, y1, x2, y2 = box.astype(int)
                        cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(
                        display,
                        f"persons: {len(boxes)}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.9,
                        (0, 255, 0),
                        2,
                    )
                    cv2.imshow("Person Detect", display)

            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord("q"):
                break

            receiver.waitFrameSync(SPOUT_SENDER_NAME, 10000)

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
