# Introducción a IFC.js (That Open Company)

**IFC.js** es un ecosistema de librerías de código abierto diseñado para leer, escribir y visualizar archivos **IFC (Industry Foundation Classes)** directamente en el navegador o en entornos de Node.js, funcionando a velocidades nativas.

Originalmente conocido como IFC.js, el proyecto ha evolucionado y hoy es la base tecnológica de **That Open Company**, cuyo objetivo es democratizar el desarrollo de aplicaciones de **Open BIM**.

## ¿Qué lo hace especial?

1. **Rendimiento Nativo (WebAssembly):** El núcleo del proyecto (`web-ifc`) está escrito en C++ y se compila a **WebAssembly (WASM)**. Esto permite procesar modelos BIM complejos de cientos de megabytes con una velocidad que antes solo era posible en aplicaciones de escritorio.

2. **Basado en Estándares:** Está diseñado específicamente para trabajar con el estándar IFC, el formato universal para el intercambio de información en la metodología BIM.

3. **Independencia de la Nube:** A diferencia de otras soluciones comerciales que requieren subir los modelos a servidores externos para ser procesados (como Autodesk Forge), IFC.js permite que todo el procesamiento ocurra en el dispositivo del usuario, garantizando privacidad y reduciendo costos.

## Componentes Principales

El ecosistema se divide en varios niveles:

- **web-ifc:** El motor de bajo nivel (parsing). Es la pieza que lee los datos del archivo IFC y los convierte en algo que Javascript puede entender.

- **web-ifc-three:** (Opcional) Una capa que integra el motor con **Three.js** para visualizar los modelos en 3D de forma sencilla.

- **That Open Platform:** El nuevo marco de trabajo que organiza estas herramientas en componentes modulares para crear aplicaciones BIM completas rápidamente.

## Casos de Uso Comunes

- Creación de visores BIM personalizados en la web.

- Extracción de datos y cantidades para presupuestos.

- Herramientas de coordinación y detección de colisiones online.

- Gestión de activos (Facility Management) vinculando modelos 3D con bases de datos.

## Conclusión

IFC.js ha eliminado la barrera de entrada para los desarrolladores que quieren crear software de construcción. Al ser **Open Source** y extremadamente rápido, permite que cualquier empresa o desarrollador independiente pueda crear sus propias herramientas de ingeniería sin depender de licencias costosas o infraestructuras propietarias.
