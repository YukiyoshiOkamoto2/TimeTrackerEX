/**
 * Vitestのセットアップファイル
 * テスト実行前に必要なグローバル設定を行います
 */

// DOMMatrixのモック（pdf.jsがNode.js環境で必要とする）
(global as any).DOMMatrix = class {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;

    constructor(init?: string | number[]) {
        // 初期化パラメータは無視
    }

    translate() {
        return this;
    }
    scale() {
        return this;
    }
    rotate() {
        return this;
    }
    multiply() {
        return this;
    }
    inverse() {
        return this;
    }
};

// pdf.jsのテスト環境フラグを設定
(global as any).__VITEST__ = true;
