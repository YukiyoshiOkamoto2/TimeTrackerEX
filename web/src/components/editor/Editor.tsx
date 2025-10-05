import { createMotionComponent, makeStyles, MotionImperativeRef, useId } from "@fluentui/react-components";
import * as monaco from "monaco-editor";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/xml/xml.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { memo, useEffect, useRef } from "react";

declare global {
    interface Window {
        MonacoEnvironment: {
            getWorker(_: string, label: string): Worker;
        };
    }
}

window.MonacoEnvironment = {
    getWorker(_: string, label: string) {
        if (label === "typescript" || label === "javascript") return new TsWorker();
        if (label === "json") return new JsonWorker();
        if (label === "css") return new CssWorker();
        if (label === "html") return new HtmlWorker();
        return new EditorWorker();
    },
};

type EditorTheme = {
    name: string;
    data: unknown;
};

const applyTheme = (
    editor: {
        defineTheme: (name: string, data: any) => void;
        setTheme: (name: string) => void;
    },
    theme: EditorTheme,
) => {
    editor.defineTheme(theme.name, theme.data);
    editor.setTheme(theme.name);
};

const useStyles = makeStyles({
    editorContainer: {
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
    },
    back: {
        position: "absolute",
        height: "100%",
        width: "100%",
        zIndex: "1",
        pointerEvents: "none",
    },
    editor: {
        top: "0",
        bottom: "0",
        left: "0",
        right: "0",
        position: "absolute",
    },
});

export type EditorProps = {
    className?: string;
    language?: string;
    readonly?: true;
    value?: string;
    theme?: EditorTheme;
    onTextChanged?: (text: string) => void;
};

const EditorEnter = createMotionComponent({
    keyframes: [{ transform: "scaleX(0.9)" }, { transform: "scaleX(1)" }],
    duration: 100,
    easing: "ease-out",
});

export const Editor = memo(({ className, language, readonly: readOnly, value, theme, onTextChanged }: EditorProps) => {
    const styles = useStyles();

    const id = useId("monaco-");
    const backRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);
    const editorDomRef = useRef<HTMLDivElement>(null);
    const motionRef = useRef<MotionImperativeRef>(undefined);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const modelRef = useRef<monaco.editor.ITextModel | null>(null);
    const preventTriggerChangeEvent = useRef<boolean>(false);

    const createEditor = (
        container: HTMLElement,
        value?: string,
        language?: string,
        readOnly?: true,
        theme?: EditorTheme,
    ): [monaco.editor.IStandaloneCodeEditor, monaco.editor.ITextModel] => {
        const editor = monaco.editor.create(container, {
            value,
            language,
            readOnly,
            automaticLayout: true,
            stickyScroll: {
                enabled: false,
            },
            minimap: {
                enabled: false,
            },
        });

        if (theme) {
            applyTheme(monaco.editor, theme);
        }

        return [editor, editor.getModel()!];
    };

    const onDidChangeContent = () => {
        if (!preventTriggerChangeEvent.current) {
            onTextChanged?.(modelRef.current?.getValue() ?? "");
        }
    };

    useEffect(() => {
        if (!editorRef.current || value === undefined) {
            return;
        }

        if (editorRef.current.getValue() !== value) {
            preventTriggerChangeEvent.current = true;
            // editorRef.current.executeEdits("", [
            //     {
            //         range: editorRef.current.getModel()!.getFullModelRange(),
            //         text: value,
            //         forceMoveMarkers: true,
            //     },
            // ]);
            modelRef.current?.setValue(value);
            // editorRef.current.getAction("editor.action.formatDocument")?.run();
            preventTriggerChangeEvent.current = false;
        }
    }, [value]);

    useEffect(() => {
        const [editor, model] = createEditor(editorDomRef.current!, value, language, readOnly, theme);
        editorRef.current = editor;
        modelRef.current = model;

        // const resize = () => {
        //     editor.layout();
        // };
        //window.addEventListener("resize", resize);
        return () => {
            model.dispose();
            editor.dispose();
            editorRef.current = null;
            modelRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (modelRef.current) {
            const func = modelRef.current.onDidChangeContent(onDidChangeContent);
            return () => func.dispose();
        }
    }, [onTextChanged]);

    return (
        <div id={id} className={styles.editorContainer + " " + (className ?? "")}>
            <div ref={backRef} className={styles.back}></div>
            <div className={styles.editor} ref={editorDomRef}></div>
            <EditorEnter imperativeRef={motionRef}>
                <div ref={lineRef} className="line"></div>
            </EditorEnter>
        </div>
    );
});
