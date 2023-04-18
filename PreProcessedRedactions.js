//Sample code to search a document for strings of text and apply redactions before viewing the document, using only WebViewer API.



//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
(exports => {

  const PDFNet = exports.Core.PDFNet;


  const runScript = () => {

    const runSearchAndRedaction = async doc => {

      // Relative path to the folder containing test files.
      const inputURL = '../../samples/full-apis/TestFiles/';
      const inputFilename = 'credit card numbers.pdf';

      try {

        //creating document
        doc = await PDFNet.PDFDoc.createFromURL(inputURL + inputFilename);
        doc.initSecurityHandler();
        doc.lock();

        //setting text search parameters
        const txtSearch = await PDFNet.TextSearch.create();

        //mode should be regex to match all instances of multiple words
        //and also highlight to get highlight
        const mode = PDFNet.TextSearch.Mode.e_reg_expression + PDFNet.TextSearch.Mode.e_highlight;

        //pattern to search for using regex. Search for multiple strings with
        //format 'the|cat|Jackson'.
        const pattern = 'Carrie Underwood|Ben Franklin';

        //the array holding all of the redaction info for each word to be redacted
        const redactionArray = [];

        //starting the text search
        txtSearch.begin(doc, pattern, mode, -1, -1);

        //call Run() iteratively to find all matching instances of the words
        while (true) {

          const result = await txtSearch.run();
          let hlts;

          if (result.code === PDFNet.TextSearch.ResultCode.e_found) {
            //get highlights information from text (for quads)
            hlts = result.highlights;
            //begin text search
            await hlts.begin(doc);

            //loops through all strings to redact, pushing quad info and page number to redaction array
            while (await hlts.hasNext()) {
              const curPage = await hlts.getCurrentPageNumber();
              const quadArr = await hlts.getCurrentQuads();
              for (let i = 0; i < quadArr.length; ++i) {
                const currQuad = quadArr[i];
                const x1 = Math.min(Math.min(Math.min(currQuad.p1x, currQuad.p2x), currQuad.p3x), currQuad.p4x);
                const x2 = Math.max(Math.max(Math.max(currQuad.p1x, currQuad.p2x), currQuad.p3x), currQuad.p4x);
                const y1 = Math.min(Math.min(Math.min(currQuad.p1y, currQuad.p2y), currQuad.p3y), currQuad.p4y);
                const y2 = Math.max(Math.max(Math.max(currQuad.p1y, currQuad.p2y), currQuad.p3y), currQuad.p4y);

                redactionArray.push(await PDFNet.Redactor.redactionCreate(curPage, (await PDFNet.Rect.init(x1, y1, x2, y2)), false, ''));
              }
              await hlts.next();
            }
          } else if (result.code === PDFNet.TextSearch.ResultCode.e_done) {
            break;
          }
        }
        //sets the appearance of the redaction
        const app = {};
        app.redaction_overlay = true;
        app.border = false;
        app.show_redacted_content_regions = true;
        app.positive_overlay_color = await new PDFNet.ColorPt.init(0, 0, 0);
        app.redacted_content_color = await new PDFNet.ColorPt.init(0, 0, 0);
        await PDFNet.Redactor.redact(doc, redactionArray, app, false, false);
        return doc;

      } catch (err) {
        console.log(err);
      }
    };


    //calls the function to preprocess the document
    const main = async () => {
      let doc = null;

      try {
        return await runSearchAndRedaction(doc);
      } catch (err) {
        console.log(err.stack);
      } finally {
        if (doc) {
          doc.unlock();
        }
      }
    };

    return PDFNet.runWithoutCleanup(main);
  }

  //loads webviewer and runs scripts after it's loaded
  window.addEventListener('viewerLoaded', () => {
    PDFNet.initialize()
      .then(() => runScript())
      .then(async doc => {
        instance.UI.loadDocument(doc);
        console.log('finished script');
      });
  });

})(window);